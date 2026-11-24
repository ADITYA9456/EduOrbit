import PageHeader from '@/components/ui/PageHeader';

export default function LegalPage({ title, updated, children }) {
  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={`Last updated ${updated}`} />
      <article className="card" style={{ maxWidth: 780, lineHeight: 1.7, padding: 'var(--space-lg, 24px)' }}>
        {children}
      </article>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}
