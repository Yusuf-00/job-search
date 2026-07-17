import { SearchResult } from '../lib/search/providers/search-provider.interface';
import ResultCard from './ResultCard';

export default function ResultsList({ result }: { result: SearchResult }) {
  if (result.hits.length === 0) {
    return <p>No jobs matched your search.</p>;
  }
  return (
    <div>
      <p style={{ color: '#666', fontSize: '14px' }}>
        {result.totalHits} results ({result.processingTimeMs}ms)
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {result.hits.map((hit) => (
          <ResultCard key={hit.id} hit={hit} />
        ))}
      </ul>
    </div>
  );
}
