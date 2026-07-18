export default function ResultsSkeleton() {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="shimmer"
          style={{
            minHeight: '96px',
            padding: '16px',
            marginBottom: '12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        />
      ))}
    </ul>
  );
}
