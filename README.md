# Job Search Platform

Postgres (Supabase) + Meilisearch + Next.js. See the walkthrough below for
the full path from raw CSV to a running search UI.

## Architecture

```
Kaggle CSVs -> ETL (load-postgres.ts) -> Supabase Postgres (source of truth)
                                              |  (trigger normalizes salary at write time)
                                              v
                                    ETL (index-meilisearch.ts)
                                              |
                                              v
                                        Meilisearch (search index)
                                              ^
                                              |
                              Next.js Route Handlers (app/api/jobs/*)
                                              ^
                                              |
                                  Next.js Server Components (app/search)
```

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- Docker (for local Meilisearch) — or a [Meilisearch Cloud](https://www.meilisearch.com/cloud) instance
- The Kaggle dataset: https://www.kaggle.com/datasets/arshkon/linkedin-job-postings

## Setup

```bash
npm install       # installs all workspaces
cp .env.example .env
```

Fill in `.env` with your Supabase connection string + keys (Project Settings
→ Database / API in the Supabase dashboard).

### 1. Create the schema

In the Supabase SQL Editor, run in order:
1. `db/schema.sql`
2. `db/trigger-normalize-salary.sql`

### 2. Download and unzip the dataset

Download `archive.zip` from the Kaggle link above, unzip it into `./data`
so you have:
```
data/postings.csv
data/companies/companies.csv
data/jobs/job_skills.csv
```

### 3. Load real data into Postgres

```bash
npm run load -w @job-search/etl
```

### 4. Augment to 200k rows

```bash
npm run augment -w @job-search/etl
```

### 5. Start Meilisearch and index

```bash
docker compose up -d meilisearch
npm run index -w @job-search/etl
```

### 6. Run the app

```bash
npm run dev -w @job-search/web
```

Visit `http://localhost:3000/search`.

## Notes

- Salary is normalized to an annual figure **at write time** by a Postgres
  trigger (`db/trigger-normalize-salary.sql`), not at query time.
- "C#" vs "C++" collisions are fixed by symmetric text normalization applied
  both when documents are indexed and when a query is issued
  (`packages/shared/src/tokenize-normalize.ts`).
- Jobs with no salary data are never excluded by a salary filter — see
  `packages/web/lib/search/filters/salary.filter.ts`.
