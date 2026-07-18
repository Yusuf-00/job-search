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
                                  Next.js Server Components (app/page)
                                          |
                                          v
                                      Client ResultsList (virtualized infinite scroll)
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

Visit `http://localhost:3000`.

## Notes

- Salary is normalized to an annual figure **at write time** by a Postgres
  trigger (`db/trigger-normalize-salary.sql`), not at query time.
- "C#" vs "C++" collisions are fixed by symmetric text normalization applied
  both when documents are indexed and when a query is issued
  (`packages/shared/src/tokenize-normalize.ts`).
- Jobs with no salary data are never excluded by a salary filter — see
  `packages/web/lib/search/filters/salary.filter.ts`.


## Result Counts And Virtualization

- The header shows the real indexed corpus size (for example, `200,000 indexed jobs`).
- A second line shows ranked pagination progress (for example,
  `Showing 160 of 10,000 ranked results`).
- This split is intentional: Meilisearch `pagination.maxTotalHits` limits
  deep pagination/reporting (currently 10,000), while matching/ranking still
  evaluates across the full indexed dataset.
- Results are loaded incrementally with infinite scroll (page-by-page) and
  rendered with virtualization so only near-viewport cards are mounted in the
  DOM at any time.
