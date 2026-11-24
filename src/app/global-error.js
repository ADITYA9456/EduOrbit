'use client';

import { useEffect } from 'react';

// Last-resort boundary for errors in the root layout itself. It must render its own <html>.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled root error', { digest: error?.digest, message: error?.message });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0b1020', color: '#e8ecf5', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <main role="alert" style={{ textAlign: 'center', padding: 24 }}>
          <h1>Something went wrong</h1>
          <p>EduOrbit hit an unexpected error. Please try again.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '10px 18px', borderRadius: 8, border: 0, cursor: 'pointer' }}>Try again</button>
        </main>
      </body>
    </html>
  );
}