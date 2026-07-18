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

  const selectStyle = {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '20px',
    paddingRight: '32px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <select
        defaultValue={initialCity ?? ''}
        onChange={(e) => updateParam('city', e.target.value)}
        aria-label="Filter by city"
        style={{ ...selectStyle, flex: '1 1 180px', minWidth: '140px' }}
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
        style={{ ...selectStyle, flex: '1 1 180px', minWidth: '140px' }}
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
