// Single-choice filter as a row of toggle buttons. options: [{ value, label, tone? }].
export default function FilterChips({ label, options, value, onChange }) {
  return (
    <div className="filter-group" role="group" aria-label={label}>
      <span className="filter-group__label">{label}</span>
      <div className="filter-group__chips">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              className={`chip ${active ? 'chip--active' : ''} ${o.tone ? `chip--${o.tone}` : ''}`}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
