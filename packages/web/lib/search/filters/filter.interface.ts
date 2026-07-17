/**
 * OCP boundary: each filter is a self-contained function object that turns
 * params into a Meilisearch filter expression. Add a new filter by adding a
 * new object here — search.service.ts's query builder never changes.
 */
export interface IJobFilter<TParams = any> {
  build(params: TParams): string | null;
}
