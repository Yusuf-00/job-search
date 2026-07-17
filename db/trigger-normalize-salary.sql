-- ============================================================================
-- Salary normalization trigger — runs on every INSERT/UPDATE into `jobs`.
-- Mirrors the logic in packages/shared/src/normalize-salary.ts exactly;
-- keep the two in sync if you change one. This one runs automatically
-- whether rows arrive via the ETL script, the Supabase dashboard, or any
-- future admin tool — normalization can't be bypassed.
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_job_salary()
RETURNS TRIGGER AS $$
DECLARE
  multiplier NUMERIC;
  raw_min NUMERIC;
  raw_max NUMERIC;
BEGIN
  multiplier := CASE upper(coalesce(NEW.raw_pay_period, ''))
    WHEN 'HOURLY'  THEN 2080  -- 40 hrs/week * 52 weeks
    WHEN 'WEEKLY'  THEN 52
    WHEN 'MONTHLY' THEN 12
    WHEN 'YEARLY'  THEN 1
    ELSE NULL                 -- includes 'ONCE' and unknown/missing periods
  END;

  raw_min := coalesce(NEW.raw_salary_min, NEW.raw_salary_median);
  raw_max := coalesce(NEW.raw_salary_max, NEW.raw_salary_median);

  IF multiplier IS NULL OR raw_min IS NULL OR raw_max IS NULL THEN
    NEW.normalized_salary_min_annual := NULL;
    NEW.normalized_salary_max_annual := NULL;
    NEW.has_salary_data := FALSE;
    RETURN NEW;
  END IF;

  NEW.normalized_salary_min_annual := round(raw_min * multiplier, 2);
  NEW.normalized_salary_max_annual := round(raw_max * multiplier, 2);

  -- Guard against corrupt source rows (e.g. a stray "$9,000,000/hour" typo
  -- in the raw dataset) producing nonsense annualized figures.
  IF NEW.normalized_salary_max_annual < 1000 OR NEW.normalized_salary_min_annual > 2000000 THEN
    NEW.normalized_salary_min_annual := NULL;
    NEW.normalized_salary_max_annual := NULL;
    NEW.has_salary_data := FALSE;
  ELSE
    NEW.has_salary_data := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_job_salary ON jobs;
CREATE TRIGGER trg_normalize_job_salary
  BEFORE INSERT OR UPDATE OF raw_salary_min, raw_salary_max, raw_salary_median, raw_pay_period
  ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION normalize_job_salary();
