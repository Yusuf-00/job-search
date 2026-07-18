import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { searchJobs, fetchCities } from '../../lib/api';
import SearchInput from '../../components/SearchInput';
import FilterPanel from '../../components/FilterPanel';
import ResultsSkeleton from '../../components/ResultsSkeleton';

const ResultsList = dynamic(() => import('../../components/ResultsList'), {
  ssr: false,
  loading: () => <ResultsSkeleton />,
});

/**
 * Server Component: query/filter state lives entirely in the URL
 * (searchParams), not client state. This means:
 *  - the initial paint is server-rendered with real results (LCP win),
 *  - searches are shareable/bookmarkable,
 *  - browser back/forward "just works" without extra client state sync.
 * The debounced client-side re-search (SearchInput) pushes new URL state,
 * which re-triggers this Server Component render.
 */
interface PageProps {
  searchParams: { q?: string; city?: string; minSalary?: string; page?: string };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const cities = await fetchCities();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
      <h1>Find a job</h1>
      <SearchInput initialQuery={searchParams.q ?? ''} />
      <FilterPanel cities={cities} initialCity={searchParams.city} initialMinSalary={searchParams.minSalary} />

      {/* Suspense boundary: filter UI above paints immediately, results
          stream in once the search resolves — avoids blocking first paint
          on the search API round-trip. */}
      <Suspense fallback={<ResultsSkeleton />}>
        {/* @ts-expect-error Async Server Component */}
        <ResultsBoundary searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ResultsBoundary({ searchParams }: PageProps) {
  const result = await searchJobs({
    q: searchParams.q,
    city: searchParams.city,
    minSalary: searchParams.minSalary ? Number(searchParams.minSalary) : undefined,
    // page param is not passed — always fetch page 1 server-side on initial render.
    // Client-side infinite scroll fetches subsequent pages via ResultsList.
  });

  // Key ensures ResultsList remounts (and resets accumulated hits) on filter/query change,
  // automatically discarding stale client-side state without manual reset logic.
  const cacheKey = `${searchParams.q ?? ''}|${searchParams.city ?? ''}|${searchParams.minSalary ?? ''}`;

  return (
    <ResultsList
      key={cacheKey}
      result={result}
      q={searchParams.q}
      city={searchParams.city}
      minSalary={searchParams.minSalary ? Number(searchParams.minSalary) : undefined}
    />
  );
}
