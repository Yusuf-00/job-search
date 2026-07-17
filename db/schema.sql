-- ============================================================================
-- Job Search Platform — Postgres schema
-- Postgres is the system of record. Meilisearch is a derived, rebuildable
-- index built FROM this data (see packages/etl/src/index-meilisearch.ts).
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id            BIGINT PRIMARY KEY,
  name          TEXT NOT NULL,
  city          TEXT,
  state         TEXT,
  country       TEXT,
  employee_count INTEGER
);

CREATE TABLE IF NOT EXISTS jobs (
  id                          BIGINT PRIMARY KEY,           -- source job_id from Kaggle dataset
  company_id                  BIGINT REFERENCES companies(id),
  title                       TEXT NOT NULL,
  description                 TEXT,
  city                        TEXT,
  state                       TEXT,
  country                     TEXT,
  work_type                   TEXT,                          -- FULL_TIME, PART_TIME, CONTRACT...
  remote_allowed               BOOLEAN DEFAULT FALSE,

  -- ---- raw salary fields exactly as they arrive from the source dataset ----
  raw_salary_min              NUMERIC,
  raw_salary_max              NUMERIC,
  raw_salary_median           NUMERIC,
  raw_pay_period               TEXT,                          -- HOURLY | WEEKLY | MONTHLY | YEARLY | ONCE
  raw_currency                 TEXT DEFAULT 'USD',

  -- ---- normalized at write time (ETL), NEVER computed at query time ----
  -- This is the field every salary filter/sort must use.
  normalized_salary_min_annual NUMERIC,
  normalized_salary_max_annual NUMERIC,
  has_salary_data               BOOLEAN NOT NULL DEFAULT FALSE, -- explicit flag, not "IS NULL" guessing

  listed_at                    TIMESTAMPTZ NOT NULL,           -- drives "newest first" sort
  expires_at                   TIMESTAMPTZ,
  is_synthetic                 BOOLEAN NOT NULL DEFAULT FALSE, -- true for the ~76k augmented rows
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skills as a separate normalized table (source dataset ships job_skills.csv
-- with a skill_abr code). Kept relational here; flattened into the search
-- index as a string array at index time.
CREATE TABLE IF NOT EXISTS job_skills (
  job_id     BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  PRIMARY KEY (job_id, skill_name)
);

-- ---------------------------------------------------------------------------
-- Indexes. Postgres here mainly serves lookups/admin/analytics — Meilisearch
-- owns the actual search path — but these keep ETL re-runs and any direct
-- SQL filtering fast.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_listed_at        ON jobs (listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_city              ON jobs (city);
CREATE INDEX IF NOT EXISTS idx_jobs_salary_max         ON jobs (normalized_salary_max_annual);
CREATE INDEX IF NOT EXISTS idx_jobs_has_salary         ON jobs (has_salary_data);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id         ON jobs (company_id);

-- Trigram index kept as a Postgres-side fallback / debugging tool for title
-- search, independent of Meilisearch. Not on the hot query path.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
