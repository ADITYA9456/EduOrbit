import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="status-page">
      <p className="status-page__code" aria-hidden="true">404</p>
      <h1 className="status-page__title">This page isn&apos;t here</h1>
      <p className="status-page__text">
        The link may be broken, or the page may have moved. Head back and keep learning.
      </p>
      <div className="status-page__actions">
        <Link href="/home" className="btn btn--primary">Back to home</Link>
        <Link href="/home#explore" className="btn btn--secondary">Browse the feed</Link>
      </div>
    </main>
  );
}
