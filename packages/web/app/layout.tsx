import './globals.css';

export const metadata = {
  title: 'JobSearch – Find Your Next Opportunity',
  description: 'Search and filter job listings by title, location, and salary.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Search and filter job listings by title, location, and salary." />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%232563eb'/><text x='50' y='65' font-size='70' font-weight='bold' fill='white' text-anchor='middle' font-family='system-ui'>J</text></svg>"
          type="image/svg+xml"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
