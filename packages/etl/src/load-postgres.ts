import { Client } from 'pg';
import { parse } from 'csv-parse';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads the raw Kaggle LinkedIn Job Postings CSVs into Postgres.
 * Salary normalization is NOT done here — it happens automatically via the
 * `trg_normalize_job_salary` trigger (db/trigger-normalize-salary.sql) the
 * moment rows are inserted. This script only maps CSV columns to raw_* columns.
 *
 * Expects, from the Kaggle dataset's archive.zip:
 *   data/postings.csv
 *   data/companies/companies.csv
 *   data/jobs/job_skills.csv
 */
const DATA_DIR = process.env.CSV_DATA_DIR ?? path.join(__dirname, '../../../data');
const PG_URL = process.env.DATABASE_URL!; // Supabase connection string (session pooler, port 5432 or 6543)
const BATCH_SIZE = 1000;

async function readCsv(filePath: string): Promise<Record<string, string>[]> {
  const content = fs.readFileSync(filePath);
  return new Promise((resolve, reject) => {
    parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

async function loadCompanies(pg: Client) {
  const rows = await readCsv(path.join(DATA_DIR, 'companies/companies.csv'));
  console.log(`Loading ${rows.length} companies...`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: any[] = [];
    const placeholders = batch
      .map((r, idx) => {
        const base = idx * 5;
        values.push(
          Number(r.company_id),
          r.name ?? 'Unknown',
          r.city ?? null,
          r.state ?? null,
          r.country ?? null,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      })
      .join(',');

    await pg.query(
      `INSERT INTO companies (id, name, city, state, country)
       VALUES ${placeholders}
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
    console.log(`  companies ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function loadJobs(pg: Client) {
  const rows = await readCsv(path.join(DATA_DIR, 'postings.csv'));
  console.log(`Loading ${rows.length} jobs...`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: any[] = [];
    const placeholders = batch
      .map((r, idx) => {
        const base = idx * 14;
        values.push(
          Number(r.job_id),
          r.company_id ? Number(r.company_id) : null,
          r.title ?? 'Untitled',
          r.description ?? null,
          r.location?.split(',')[0]?.trim() ?? null, // city (CSV ships "City, ST")
          r.location?.split(',')[1]?.trim() ?? null, // state
          'US',
          r.formatted_work_type ?? null,
          r.remote_allowed === '1' || r.remote_allowed === 'true',
          r.min_salary ? Number(r.min_salary) : null,
          r.max_salary ? Number(r.max_salary) : null,
          r.med_salary ? Number(r.med_salary) : null,
          r.pay_period ?? null,
          r.listed_time ? new Date(Number(r.listed_time)).toISOString() : new Date().toISOString(),
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`;
      })
      .join(',');

    await pg.query(
      `INSERT INTO jobs (
         id, company_id, title, description, city, state, country,
         work_type, remote_allowed,
         raw_salary_min, raw_salary_max, raw_salary_median, raw_pay_period, listed_at
       ) VALUES ${placeholders}
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
    console.log(`  jobs ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function loadSkills(pg: Client) {
  const filePath = path.join(DATA_DIR, 'jobs/job_skills.csv');
  if (!fs.existsSync(filePath)) {
    console.log('job_skills.csv not found, skipping skills load.');
    return;
  }
  const rows = await readCsv(filePath);
  console.log(`Loading ${rows.length} job_skills rows...`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).filter((r) => r.job_id && r.skill_abr);
    if (batch.length === 0) continue;
    const values: any[] = [];
    const placeholders = batch
      .map((r, idx) => {
        const base = idx * 2;
        values.push(Number(r.job_id), r.skill_abr);
        return `($${base + 1}, $${base + 2})`;
      })
      .join(',');

    await pg.query(
      `INSERT INTO job_skills (job_id, skill_name)
       VALUES ${placeholders}
       ON CONFLICT DO NOTHING`,
      values,
    );
  }
}

async function main() {
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  await loadCompanies(pg);
  await loadJobs(pg);
  await loadSkills(pg);

  await pg.end();
  console.log('Load complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
