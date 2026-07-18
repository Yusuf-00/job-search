import { MeiliSearch } from 'meilisearch';
import { ISearchProvider, SearchQuery, SearchResult } from './search-provider.interface';

export class MeilisearchProvider implements ISearchProvider {
  private client: MeiliSearch;
  private cachedTotalIndexedJobs: number | null = null;
  private cachedTotalIndexedJobsAt = 0;

  constructor() {
    this.client = new MeiliSearch({
      host: process.env.MEILI_URL ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_MASTER_KEY,
    });
  }

  private async getTotalIndexedJobs(indexName: string): Promise<number> {
    const now = Date.now();
    if (this.cachedTotalIndexedJobs !== null && now - this.cachedTotalIndexedJobsAt < 60_000) {
      return this.cachedTotalIndexedJobs;
    }

    const stats = await this.client.index(indexName).getStats();
    this.cachedTotalIndexedJobs = stats.numberOfDocuments;
    this.cachedTotalIndexedJobsAt = now;

    return stats.numberOfDocuments;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const indexName = 'jobs';
    const index = this.client.index(indexName);
    const response = await index.search(query.q, {
      filter: query.filters.length ? query.filters.join(' AND ') : undefined,
      sort: query.sort.length ? query.sort : undefined,
      page: query.page,
      hitsPerPage: query.pageSize,
    });
    let totalIndexedJobs = response.totalHits ?? 0;
    try {
      totalIndexedJobs = await this.getTotalIndexedJobs(indexName);
    } catch {
      // Keep search responsive even if stats endpoint is temporarily unavailable.
    }

    return {
      hits: response.hits as any,
      totalHits: response.totalHits ?? 0,
      totalIndexedJobs,
      page: response.page ?? query.page,
      pageSize: response.hitsPerPage ?? query.pageSize,
      processingTimeMs: response.processingTimeMs,
    };
  }

  async listFacetValues(facet: string): Promise<string[]> {
    const index = this.client.index('jobs');
    const result = await index.search('', { facets: [facet], hitsPerPage: 0 });
    const distribution = result.facetDistribution?.[facet] ?? {};
    return Object.keys(distribution).sort();
  }
}

// Composition root: single shared instance, since MeiliSearch client is
// stateless/cheap to reuse across requests in the Next.js server runtime.
export const searchProvider: ISearchProvider = new MeilisearchProvider();
