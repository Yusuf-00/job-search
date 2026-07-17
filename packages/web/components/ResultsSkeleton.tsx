export default function ResultsSkeleton() {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          style={{
            minHeight: '96px',
            padding: '16px 0',
            borderBottom: '1px solid #eee',
            background: 'linear-gradient(90deg, #f5f5f5 25%, #eee 37%, #f5f5f5 63%)',
          }}
        />
      ))}
    </ul>
  );
}
