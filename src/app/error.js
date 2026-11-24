'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // The digest links this browser error to the matching server log line.
    console.error('Unhandled UI error', { digest: error?.digest, message: error?.message });
  }, [error]);

  return (
    <main className="status-page" role="alert">
      <p className="status-page__code" aria-hidden="true">Oops</p>
      <h1 className="status-page__title">Something went wrong</h1>
      <p className="status-page__text">
        An unexpected error stopped this page from loading. You can try again or go back.
      </p>
      <div className="status-page__actions">
        <button type="button" className="btn btn--primary" onClick={() => reset()}>Try again</button>
        <Link href="/home" className="btn btn--secondary">Back to home</Link>
        <Link href="/home#explore" className="btn btn--ghost">Browse the feed</Link>
      </div>
    </main>
  );
}
