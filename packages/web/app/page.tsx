import { Suspense } from 'react';
import { searchJobs, fetchCities } from '../lib/api';
import SearchInput from '../components/SearchInput';
import FilterPanel from '../components/FilterPanel';
import ResultsList from '../components/ResultsList';
import ResultsSkeleton from '../components/ResultsSkeleton';

interface PageProps {
  searchParams: { q?: string; city?: string; minSalary?: string; page?: string };
}

export default async function HomePage({ searchParams }: PageProps) {
  const cities = await fetchCities();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent)', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
          JobSearch
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Find your next opportunity
        </p>
      </header>
      <div style={{ marginBottom: '24px' }}>
        <SearchInput initialQuery={searchParams.q ?? ''} />
      </div>
      <div style={{ marginBottom: '24px' }}>
        <FilterPanel cities={cities} initialCity={searchParams.city} initialMinSalary={searchParams.minSalary} />
      </div>

      <Suspense fallback={<ResultsSkeleton />}>
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
  });

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