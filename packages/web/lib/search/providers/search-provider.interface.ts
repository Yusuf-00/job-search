/**
 * DIP boundary: route handlers and the search service depend on this
 * interface, never on Meilisearch directly. No DI container needed for
 * this to hold — it's just "depend on the interface, inject the
 * implementation at the composition root" (see search.service.ts).
 */
export interface SearchQuery {
  q: string;
  filters: string[];
  sort: string[];
  page: number;
  pageSize: number;
}

export interface SearchHit {
  id: string | number;
  displayTitle: string;
  displayDescription?: string;
  description?: string;
  skills: string[];
  companyName: string;
  city: string | null;
  state: string | null;
  workType: string | null;
  remoteAllowed: boolean;
  rawSalaryMin: number | null;
  rawSalaryMax: number | null;
  rawSalaryMedian: number | null;
  rawPayPeriod: string | null;
  normalizedSalaryMinAnnual: number | null;
  normalizedSalaryMaxAnnual: number | null;
  hasSalaryData: boolean;
  listedAtTimestamp: number;
}

export interface SearchResult {
  hits: SearchHit[];
  totalHits: number;
  totalIndexedJobs: number;
  page: number;
  pageSize: number;
  processingTimeMs: number;
}

export interface ISearchProvider {
  search(query: SearchQuery): Promise<SearchResult>;
  listFacetValues(facet: string): Promise<string[]>;
}
