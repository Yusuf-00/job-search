import { Client } from 'pg';
import { MeiliSearch } from 'meilisearch';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeDocumentText } from '../../shared/src/tokenize-normalize';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Check that .env exists at the repo root and contains your Supabase connection string.',
  );
}
const PG_URL = process.env.DATABASE_URL;
const MEILI_URL = process.env.MEILI_URL ?? 'http://localhost:7700';
const MEILI_API_KEY = process.env.MEILI_MASTER_KEY;
const BATCH_SIZE = 5000;

async function main() {
  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();

  const meili = new MeiliSearch({ host: MEILI_URL, apiKey: MEILI_API_KEY });
  const index = meili.index('jobs');

  // Apply settings BEFORE documents land — Meilisearch builds ranking
  // structures incrementally, and changing settings after a large import
  // forces a full reindex anyway, so do it once, up front.
  const settings = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../meilisearch/index-settings.json'), 'utf-8'),
  );
  // Strip our own "_comment" documentation keys before sending — Meilisearch
  // will reject unknown top-level keys.
  const cleanSettings = Object.fromEntries(
    Object.entries(settings).filter(([k]) => !k.startsWith('_')),
  );
  await index.updateSettings(cleanSettings as any);
  console.log('Meilisearch index settings applied.');

  const countResult = await pg.query('SELECT count(*) FROM jobs');
  const total = Number(countResult.rows[0].count);
  console.log(`Indexing ${total} jobs in batches of ${BATCH_SIZE}...`);

  // Keyset pagination instead of OFFSET: OFFSET forces Postgres to scan and
  // discard every prior row on every batch, which gets progressively
  // slower as you page deeper into a 200k-row table with joins/group by —
  // slow enough at high offsets to hit a connection statement timeout
  // (exactly what happened around offset 85,000). WHERE id > lastId keeps
  // every batch equally fast via the primary key index, regardless of how
  // far into the table you are.
  let lastId = 0;
  let indexed = 0;

  while (true) {
    const { rows } = await pg.query(
      `
      SELECT
        j.id, j.title, j.description, j.city, j.state, j.country,
        j.work_type, j.remote_allowed,
        j.raw_salary_min, j.raw_salary_max, j.raw_salary_median, j.raw_pay_period,
        j.normalized_salary_min_annual, j.normalized_salary_max_annual,
        j.has_salary_data, j.listed_at,
        c.name AS company_name,
        coalesce(array_agg(js.skill_name) FILTER (WHERE js.skill_name IS NOT NULL), '{}') AS skills
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      LEFT JOIN job_skills js ON js.job_id = j.id
      WHERE j.id > $1
      GROUP BY j.id, c.name
      ORDER BY j.id
      LIMIT $2
      `,
      [lastId, BATCH_SIZE],
    );

    if (rows.length === 0) break;

    const documents = rows.map((row) => ({
      id: row.id,
      // Text fields normalized identically to how queries will be normalized
      // at search time (see tokenize-normalize.ts) — this symmetry is what
      // makes "C# developer" match "csharp" tokens and nothing else.
      title: normalizeDocumentText(row.title),
      description: normalizeDocumentText(row.description),
      companyName: row.company_name ?? '',
      skills: (row.skills as string[]).map((s) => normalizeDocumentText(s)),
      city: row.city,
      state: row.state,
      country: row.country,
      workType: row.work_type,
      remoteAllowed: row.remote_allowed,
      // node-postgres returns NUMERIC columns as strings by default (to avoid
      // float precision loss), so these must be cast to actual numbers here —
      // otherwise Meilisearch indexes them as strings and the >= comparison
      // filter in salary.filter.ts silently misbehaves.
      rawSalaryMin: row.raw_salary_min !== null ? Number(row.raw_salary_min) : null,
      rawSalaryMax: row.raw_salary_max !== null ? Number(row.raw_salary_max) : null,
      rawSalaryMedian: row.raw_salary_median !== null ? Number(row.raw_salary_median) : null,
      rawPayPeriod: row.raw_pay_period ?? null,
      normalizedSalaryMinAnnual:
        row.normalized_salary_min_annual !== null ? Number(row.normalized_salary_min_annual) : null,
      normalizedSalaryMaxAnnual:
        row.normalized_salary_max_annual !== null ? Number(row.normalized_salary_max_annual) : null,
      hasSalaryData: row.has_salary_data,
      listedAtTimestamp: new Date(row.listed_at).getTime(),
      // Keep original, un-normalized title/description/skills for display in
      // the UI — normalization is a search-index concern, not a presentation
      // one.
      displayTitle: row.title,
      displayDescription: row.description ?? '',
    }));

    await index.addDocuments(documents, { primaryKey: 'id' });
    lastId = rows[rows.length - 1].id;
    indexed += rows.length;
    console.log(`Indexed ${indexed}/${total}`);
  }

  await pg.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});