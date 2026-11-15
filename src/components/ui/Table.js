// Semantic table primitive: caption + scoped headers. Wrapper scrolls on narrow screens
// so a wide table never forces horizontal page scroll.
export default function Table({ caption, columns, children, className = '' }) {
  return (
    <div className={`table-wrap ${className}`} tabIndex={0} role="region" aria-label={caption}>
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.className}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
