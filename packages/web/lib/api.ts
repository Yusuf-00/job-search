// Same-origin now that search lives in Next.js Route Handlers — no
// separate API base URL/CORS config needed.

export interface SearchParamsInput {
  q?: string;
  city?: string;
  minSalary?: number;
  page?: number;
}

export async function searchJobs(params: SearchParamsInput) {
  const url = new URL('/api/jobs/search', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  if (params.q) url.searchParams.set('q', params.q);
  if (params.city) url.searchParams.set('city', params.city);
  if (params.minSalary) url.searchParams.set('minSalary', String(params.minSalary));
  if (params.page) url.searchParams.set('page', String(params.page));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function fetchCities(): Promise<string[]> {
  const url = new URL('/api/jobs/cities', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return res.json();
}
