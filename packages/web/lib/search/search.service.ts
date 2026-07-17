import { searchProvider } from './providers/meilisearch.provider';
import { salaryFilter } from './filters/salary.filter';
import { cityFilter } from './filters/city.filter';
import { normalizeQueryText } from '../../../shared/src/tokenize-normalize';
import { SearchResult } from './providers/search-provider.interface';

export interface JobSearchParams {
  q?: string;
  city?: string;
  minSalaryAnnual?: number;
  page?: number;
  pageSize?: number;
}

/**
 * SRP: turns request params into a provider-agnostic SearchQuery. Depends
 * only on ISearchProvider (imported as the `searchProvider` singleton from
 * the composition root in meilisearch.provider.ts) — swapping engines means
 * changing that one export, not this function.
 */
export async function searchJobsService(params: JobSearchParams): Promise<SearchResult> {
  const filters = [
    salaryFilter.build({ minSalaryAnnual: params.minSalaryAnnual }),
    cityFilter.build({ city: params.city }),
  ].filter((f): f is string => f !== null);

  const q = normalizeQueryText(params.q ?? '');

  // "Newest jobs at the top": ranking rules put relevance before sort (see
  // meilisearch/index-settings.json), so listedAt acts as tiebreaker among
  // equally-relevant hits, and as the primary order when q is empty.
  const sort = ['listedAtTimestamp:desc'];

  return searchProvider.search({
    q,
    filters,
    sort,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  });
}

export async function listCitiesService(): Promise<string[]> {
  return searchProvider.listFacetValues('city');
}
