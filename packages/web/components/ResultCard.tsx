import { SearchHit } from '../lib/search/providers/search-provider.interface';

export default function ResultCard({ hit }: { hit: SearchHit }) {
  const salaryLabel = hit.hasSalaryData
    ? `$${hit.normalizedSalaryMinAnnual?.toLocaleString()} - $${hit.normalizedSalaryMaxAnnual?.toLocaleString()} / yr`
    : 'Salary not listed';

  return (
    // Fixed min-height matches the skeleton card below — prevents CLS as
    // real cards replace skeletons.
    <li style={{ minHeight: '96px', padding: '16px 0', borderBottom: '1px solid #eee' }}>
      <h3 style={{ margin: 0 }}>{hit.displayTitle}</h3>
      <p style={{ margin: '4px 0', color: '#444' }}>
        {hit.companyName} — {hit.city ?? 'Location unspecified'}
      </p>
      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{salaryLabel}</p>
    </li>
  );
}
