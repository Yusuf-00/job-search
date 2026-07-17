/**
 * Salary normalization — runs ONCE at ETL/write time, never at query time.
 *
 * Why write-time: normalizing on every query means either (a) doing the
 * math in SQL on every filtered row, which kills index usage, or (b) doing
 * it in application code after fetching, which breaks pagination/sorting.
 * Normalize once, index the annual figure, query against that.
 *
 * Assumptions, made explicit (call these out in the write-up):
 * - HOURLY  -> annual = hourly * 2080  (40 hrs/week * 52 weeks)
 * - WEEKLY  -> annual = weekly * 52
 * - MONTHLY -> annual = monthly * 12
 * - YEARLY  -> annual = as-is
 * - ONCE (one-time / contract lump sum) -> excluded from normalized salary
 *   entirely; treated as has_salary_data = false, since it isn't comparable
 *   to an annualized rate and would distort filtering.
 */

export type PayPeriod = 'HOURLY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ONCE';

export interface RawSalaryInput {
  min?: number | null;
  max?: number | null;
  median?: number | null;
  payPeriod?: PayPeriod | string | null;
}

export interface NormalizedSalary {
  normalizedMinAnnual: number | null;
  normalizedMaxAnnual: number | null;
  hasSalaryData: boolean;
}

const HOURS_PER_YEAR = 2080; // 40 * 52
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

const multiplierFor = (period: PayPeriod): number | null => {
  switch (period) {
    case 'HOURLY':
      return HOURS_PER_YEAR;
    case 'WEEKLY':
      return WEEKS_PER_YEAR;
    case 'MONTHLY':
      return MONTHS_PER_YEAR;
    case 'YEARLY':
      return 1;
    case 'ONCE':
      return null; // explicitly not annualizable
    default:
      return null;
  }
};

export function normalizeSalary(input: RawSalaryInput): NormalizedSalary {
  const period = (input.payPeriod ?? '').toString().toUpperCase() as PayPeriod;
  const multiplier = multiplierFor(period);

  // Fall back to median if min/max are both missing but median exists
  // (the Kaggle dataset has rows where only med_salary is populated).
  const rawMin = input.min ?? input.median ?? null;
  const rawMax = input.max ?? input.median ?? null;

  if (multiplier === null || rawMin === null || rawMax === null) {
    return { normalizedMinAnnual: null, normalizedMaxAnnual: null, hasSalaryData: false };
  }

  const min = round(rawMin * multiplier);
  const max = round(rawMax * multiplier);

  // Sanity guard against obviously corrupt source rows (e.g. a $9,000,000
  // "hourly" typo in the raw data — this happens in the real dataset).
  const PLAUSIBLE_MIN_ANNUAL = 1000;
  const PLAUSIBLE_MAX_ANNUAL = 2_000_000;
  if (max < PLAUSIBLE_MIN_ANNUAL || min > PLAUSIBLE_MAX_ANNUAL) {
    return { normalizedMinAnnual: null, normalizedMaxAnnual: null, hasSalaryData: false };
  }

  return { normalizedMinAnnual: min, normalizedMaxAnnual: max, hasSalaryData: true };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Example (matches the brief's "$35/hour" case):
//   normalizeSalary({ min: 35, max: 35, payPeriod: 'HOURLY' })
//   -> { normalizedMinAnnual: 72800, normalizedMaxAnnual: 72800, hasSalaryData: true }
//   72,800 >= 60,000 -> passes a "$60k minimum" filter, as required.
// ---------------------------------------------------------------------------
