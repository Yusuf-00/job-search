import { MeiliSearch } from 'meilisearch';
import { ISearchProvider, SearchQuery, SearchResult } from './search-provider.interface';

export class MeilisearchProvider implements ISearchProvider {
  private client: MeiliSearch;

  constructor() {
    this.client = new MeiliSearch({
      host: process.env.MEILI_URL ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_MASTER_KEY,
    });
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const index = this.client.index('jobs');
    const response = await index.search(query.q, {
      filter: query.filters.length ? query.filters.join(' AND ') : undefined,
      sort: query.sort.length ? query.sort : undefined,
      page: query.page,
      hitsPerPage: query.pageSize,
    });

    return {
      hits: response.hits as any,
      totalHits: response.totalHits ?? response.estimatedTotalHits ?? 0,
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
