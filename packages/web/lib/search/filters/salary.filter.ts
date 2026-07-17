import { IJobFilter } from './filter.interface';

export interface SalaryFilterParams {
  minSalaryAnnual?: number;
}

/**
 * Requirement: "if a job doesn't have salary, applicants who search by
 * salary can see it too." Explicit OR against hasSalaryData — NOT a plain
 * `>=` range filter, which would silently drop every salary-less job.
 */
export const salaryFilter: IJobFilter<SalaryFilterParams> = {
  build({ minSalaryAnnual }) {
    if (minSalaryAnnual === undefined || minSalaryAnnual === null) return null;
    return `(normalizedSalaryMaxAnnual >= ${minSalaryAnnual} OR hasSalaryData = false)`;
  },
};
