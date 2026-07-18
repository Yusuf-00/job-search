import { SearchHit } from '../lib/search/providers/search-provider.interface';

const PAY_PERIOD_LABEL: Record<string, string> = {
  HOURLY: '/hr',
  WEEKLY: '/wk',
  MONTHLY: '/mo',
  YEARLY: '/yr',
};

function buildSalaryLabel(hit: SearchHit): string {
  if (!hit.hasSalaryData) return 'Salary not listed';

  const period = hit.rawPayPeriod?.toUpperCase() ?? 'YEARLY';
  const suffix = PAY_PERIOD_LABEL[period] ?? '/yr';

  const rawMin = hit.rawSalaryMin ?? hit.rawSalaryMedian;
  const rawMax = hit.rawSalaryMax ?? hit.rawSalaryMedian;

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const rawLabel =
    rawMin !== null && rawMax !== null
      ? rawMin === rawMax
        ? `${fmt(rawMin)}${suffix}`
        : `${fmt(rawMin)} – ${fmt(rawMax)}${suffix}`
      : null;

  const annualMin = hit.normalizedSalaryMinAnnual;
  const annualMax = hit.normalizedSalaryMaxAnnual;
  const annualLabel =
    period !== 'YEARLY' && annualMin !== null && annualMax !== null
      ? ` (≈ ${annualMin === annualMax ? fmt(annualMin) : `${fmt(annualMin)} – ${fmt(annualMax)}`}/yr)`
      : '';

  return rawLabel ? `${rawLabel}${annualLabel}` : 'Salary not listed';
}

export default function ResultCard({ hit, onClick }: { hit: SearchHit; onClick?: () => void }) {
  const salaryLabel = buildSalaryLabel(hit);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {hit.displayTitle}
      </h3>
      <p style={{ margin: '8px 0 6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        {hit.companyName} — {hit.city ?? 'Location unspecified'}
      </p>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{salaryLabel}</p>
    </div>
  );
}
