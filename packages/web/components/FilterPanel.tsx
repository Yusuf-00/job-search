'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  cities: string[];
  initialCity?: string;
  initialMinSalary?: string;
}

/**
 * CLS note: this panel has a fixed, reserved width/height regardless of
 * whether `cities` has loaded — it never causes a layout shift once results
 * start streaming in below it.
 */
export default function FilterPanel({ cities, initialCity, initialMinSalary }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', gap: '16px', margin: '16px 0', minHeight: '42px' }}>
      <select
        defaultValue={initialCity ?? ''}
        onChange={(e) => updateParam('city', e.target.value)}
        aria-label="Filter by city"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        defaultValue={initialMinSalary ?? ''}
        onChange={(e) => updateParam('minSalary', e.target.value)}
        aria-label="Minimum annual salary"
      >
        <option value="">Any salary</option>
        <option value="40000">$40,000+</option>
        <option value="60000">$60,000+</option>
        <option value="80000">$80,000+</option>
        <option value="100000">$100,000+</option>
        <option value="150000">$150,000+</option>
      </select>
    </div>
  );
}
