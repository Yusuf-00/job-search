import { Client } from 'pg';
import { MeiliSearch } from 'meilisearch';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeDocumentText } from '../../shared/src/tokenize-normalize';

const PG_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/jobsearch';
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

  let offset = 0;
  while (offset < total) {
    const { rows } = await pg.query(
      `
      SELECT
        j.id, j.title, j.description, j.city, j.state, j.country,
        j.work_type, j.remote_allowed,
        j.normalized_salary_min_annual, j.normalized_salary_max_annual,
        j.has_salary_data, j.listed_at,
        c.name AS company_name,
        coalesce(array_agg(js.skill_name) FILTER (WHERE js.skill_name IS NOT NULL), '{}') AS skills
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      LEFT JOIN job_skills js ON js.job_id = j.id
      GROUP BY j.id, c.name
      ORDER BY j.id
      LIMIT $1 OFFSET $2
      `,
      [BATCH_SIZE, offset],
    );

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
      normalizedSalaryMinAnnual: row.normalized_salary_min_annual,
      normalizedSalaryMaxAnnual: row.normalized_salary_max_annual,
      hasSalaryData: row.has_salary_data,
      listedAtTimestamp: new Date(row.listed_at).getTime(),
      // Keep original, un-normalized title for display in the UI —
      // normalization is a search-index concern, not a presentation one.
      displayTitle: row.title,
    }));

    await index.addDocuments(documents, { primaryKey: 'id' });
    offset += BATCH_SIZE;
    console.log(`Indexed ${Math.min(offset, total)}/${total}`);
  }

  await pg.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
