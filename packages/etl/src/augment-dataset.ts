import { Client } from 'pg';

/**
 * Augments real data to ~200k rows by SAMPLING from real distributions
 * already in the database (titles, cities, companies, salary ranges) rather
 * than duplicating rows outright. Duplicates would make relevance testing
 * meaningless (every query returns clusters of identical results); sampled
 * recombinations stay realistic while being distinguishable.
 *
 * Each synthetic job is flagged is_synthetic = true so it can be excluded
 * from analysis or clearly labeled in a demo if needed.
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Check that .env exists at the repo root and contains your Supabase connection string.',
  );
}
const PG_URL = process.env.DATABASE_URL;
const TARGET_TOTAL = 200_000;

function randomRecentDate(maxDaysAgo = 60): Date {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: countRows } = await pg.query('SELECT count(*) FROM jobs');
  const currentCount = Number(countRows[0].count);
  const needed = TARGET_TOTAL - currentCount;

  if (needed <= 0) {
    console.log(`Already at ${currentCount} rows, no augmentation needed.`);
    await pg.end();
    return;
  }
  console.log(`Have ${currentCount} rows, generating ${needed} synthetic rows...`);

  // Pull real distributions to sample from — this is what keeps synthetic
  // postings realistic instead of gibberish.
  const { rows: titles } = await pg.query('SELECT DISTINCT title FROM jobs LIMIT 5000');
  const { rows: descriptions } = await pg.query(
    'SELECT description FROM jobs WHERE description IS NOT NULL LIMIT 5000',
  );
  const { rows: cities } = await pg.query('SELECT DISTINCT city, state FROM jobs WHERE city IS NOT NULL LIMIT 500');
  const { rows: companies } = await pg.query('SELECT id FROM companies LIMIT 5000');
  const { rows: workTypes } = await pg.query('SELECT DISTINCT work_type FROM jobs WHERE work_type IS NOT NULL');
  const { rows: salaryTemplates } = await pg.query(
    `SELECT raw_salary_min, raw_salary_max, raw_pay_period FROM jobs WHERE has_salary_data = true LIMIT 5000`,
  );

  // Synthetic IDs start well above the real max job_id to avoid collisions.
  const { rows: maxIdRows } = await pg.query('SELECT max(id) AS max_id FROM jobs');
  let nextId = Number(maxIdRows[0].max_id) + 1;

  const BATCH_SIZE = 1000;
  let generated = 0;

  while (generated < needed) {
    const batchSize = Math.min(BATCH_SIZE, needed - generated);
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < batchSize; i++) {
      const city = pick(cities);
      const salary = Math.random() > 0.15 ? pick(salaryTemplates) : null; // ~15% no salary, matches real dataset's rate
      const id = nextId++;
      const base = i * 12;

      values.push(
        id,
        pick(companies)?.id ?? null,
        pick(titles).title,
        pick(descriptions)?.description ?? null,
        city.city,
        city.state,
        pick(workTypes)?.work_type ?? 'FULL_TIME',
        Math.random() > 0.7,
        salary?.raw_salary_min ?? null,
        salary?.raw_salary_max ?? null,
        salary?.raw_pay_period ?? null,
        randomRecentDate().toISOString(),
      );
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, true)`,
      );
    }

    await pg.query(
      `INSERT INTO jobs (
         id, company_id, title, description, city, state,
         work_type, remote_allowed, raw_salary_min, raw_salary_max, raw_pay_period, listed_at, is_synthetic
       ) VALUES ${placeholders.join(',')}`,
      values,
    );

    generated += batchSize;
    console.log(`Generated ${generated}/${needed}`);
  }

  await pg.end();
  console.log('Augmentation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});