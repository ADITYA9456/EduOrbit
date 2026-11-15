'use client';

import { CATEGORIES } from '@/lib/constants';

export default function CategoryPills({ active, onChange }) {
  return (
    <div className="category-pills" role="group" aria-label="Filter by category">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          aria-pressed={active === cat}
          className={`category-pill ${active === cat ? 'category-pill--active' : ''}`}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
