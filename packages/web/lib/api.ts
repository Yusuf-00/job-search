// Same-origin now that search lives in Next.js Route Handlers — no
// separate API base URL/CORS config needed. This is called client-side only
// (see ResultsList.tsx), so a relative URL resolves against the browser's
// current origin without needing NEXT_PUBLIC_SITE_URL.

export interface SearchParamsInput {
  q?: string;
  city?: string;
  minSalary?: number;
  page?: number;
}

export async function searchJobs(params: SearchParamsInput) {
  const url = new URL('/api/jobs/search', window.location.origin);
  if (params.q) url.searchParams.set('q', params.q);
  if (params.city) url.searchParams.set('city', params.city);
  if (params.minSalary) url.searchParams.set('minSalary', String(params.minSalary));
  if (params.page) url.searchParams.set('page', String(params.page));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}
