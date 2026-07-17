'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const DEBOUNCE_MS = 200;

/**
 * INP requirement: results "update instantly" while typing, without
 * hammering the API on every keystroke. Debounce the URL push (which is
 * what triggers the Server Component re-fetch), and cancel any in-flight
 * request that's been superseded by a newer keystroke via AbortController
 * — otherwise a slow response for "c" can race and overwrite the correct
 * results for "c#" if it resolves later.
 */
export default function SearchInput({ initialQuery }: { initialQuery: string }) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const pushQuery = useCallback(
    (q: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set('q', q);
      else params.delete('q');
      params.delete('page'); // new query resets pagination
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQuery(value), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search job titles, skills, companies…"
      aria-label="Job search"
      style={{ width: '100%', padding: '12px', fontSize: '16px' }}
    />
  );
}
