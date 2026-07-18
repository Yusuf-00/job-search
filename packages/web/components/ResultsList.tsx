'use client';

import { useEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { SearchResult, SearchHit } from '../lib/search/providers/search-provider.interface';
import { searchJobs } from '../lib/api';
import ResultCard from './ResultCard';

interface ResultsListProps {
  result: SearchResult;
  q?: string;
  city?: string;
  minSalary?: number;
}

export default function ResultsList({ result, q, city, minSalary }: ResultsListProps) {
  // Seed initial state from the server-fetched page 1 result
  const [hits, setHits] = useState<SearchHit[]>(result.hits || []);
  const [totalIndexedJobs] = useState(result.totalIndexedJobs || 0);
  const [totalHits] = useState(result.totalHits || 0);

  // Refs to track pagination and prevent duplicate fetches
  const nextPageRef = useRef(2);
  const isFetchingRef = useRef(false);
  const hasReachedEndRef = useRef(false);

  // Virtualization setup: fixed 96px card height, overscan for smooth scrolling
  const virtualizer = useWindowVirtualizer({
    count: hits.length,
    estimateSize: () => 96,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Load-more effect: triggered when scrolling near the end of loaded results
  useEffect(() => {
    // Early exit conditions
    if (virtualItems.length === 0) return;
    if (hasReachedEndRef.current) return;
    if (isFetchingRef.current) return;
    if (hits.length >= totalHits && totalHits > 0) return; // Already have all results

    const lastVirtualItem = virtualItems[virtualItems.length - 1];
    const threshold = 5;

    // Check if user is scrolling near the end
    if (lastVirtualItem.index < hits.length - threshold) {
      return; // Not near the end yet
    }

    // Trigger load: we're near the end and haven't loaded everything yet
    (async () => {
      isFetchingRef.current = true;

      try {
        const res = await searchJobs({
          q,
          city,
          minSalary,
          page: nextPageRef.current,
        });

        if (!res.hits || res.hits.length === 0) {
          hasReachedEndRef.current = true;
          return;
        }

        // Append hits
        setHits((prev) => [...prev, ...res.hits]);
        nextPageRef.current += 1;

        // Stop if we've received a partial page (less than full 20)
        if (res.hits.length < 20) {
          hasReachedEndRef.current = true;
        }
      } catch (err) {
        console.error('Failed to fetch next page:', err);
        // Don't mark as ended on error; allow retry on next scroll
      } finally {
        isFetchingRef.current = false;
      }
    })();
  }, [virtualItems, hits.length, totalHits, q, city, minSalary]);

  if (hits.length === 0) {
    return <p>No jobs matched your search.</p>;
  }

  return (
    <div>
      <p style={{ color: '#666', fontSize: '14px' }}>
        {totalIndexedJobs.toLocaleString()} indexed jobs
      </p>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Showing {hits.length.toLocaleString()} of {totalHits.toLocaleString()} ranked results
      </p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          position: 'relative',
          width: '100%',
          height: `${totalSize}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const hit = hits[virtualItem.index];
          return (
            <li
              key={hit.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ResultCard hit={hit} />
            </li>
          );
        })}
      </ul>
      {isFetchingRef.current && (
        <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
          Loading more...
        </p>
      )}
    </div>
  );
}
