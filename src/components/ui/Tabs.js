'use client';

import { useId, useRef } from 'react';

// Controlled tabs. tabs: [{ id, label }]. Render the panel content yourself using
// `panelProps(id)` or pass children for the active panel.
export default function Tabs({ tabs, value, onChange, label, children, className = '' }) {
  const base = useId();
  const refs = useRef({});

  const move = (index) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(tabs.length - 1); }
  };

  return (
    <div className={`tabs ${className}`}>
      <div className="tabs__list" role="tablist" aria-label={label}>
        {tabs.map((t, i) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={selected && children !== undefined ? `${base}-panel-${t.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              className={`tabs__tab ${selected ? 'tabs__tab--active' : ''}`}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        <div
          className="tabs__panel"
          role="tabpanel"
          id={`${base}-panel-${value}`}
          aria-labelledby={`${base}-tab-${value}`}
          tabIndex={0}
        >
          {children}
        </div>
      )}
    </div>
  );
}
