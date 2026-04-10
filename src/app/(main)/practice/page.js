'use client';

// Practice Page
// - Reads cached questions from Supabase table: `questions`
// - Provides filters (difficulty/source) and title search
// - Uses Tailwind for a clean, responsive card grid UI

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];
const SOURCE_OPTIONS = [
  { value: 'All', label: 'All Sources' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'gfg', label: 'GFG' },
];

function difficultyBadgeClass(difficulty) {
  const base =
    'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold';

  if (difficulty === 'Easy') return `${base} border-[var(--success)] text-[var(--success)]`;
  if (difficulty === 'Medium') return `${base} border-[var(--warning)] text-[var(--warning)]`;
  if (difficulty === 'Hard') return `${base} border-[var(--danger)] text-[var(--danger)]`;
  return `${base} border-[var(--border-color)] text-[var(--text-secondary)]`;
}

function sourceLabel(source) {
  if (source === 'leetcode') return 'LeetCode';
  if (source === 'gfg') return 'GFG';
  return source || 'Unknown';
}

export default function PracticePage() {
  const supabase = useMemo(() => createClient(), []);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [source, setSource] = useState('All');

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');

    // Fetch directly from Supabase cache table.
    // This page does NOT call LeetCode (or the sync API) from the browser.
    let q = supabase
      .from('questions')
      .select('id, title, difficulty, slug, tags, source')
      .order('title', { ascending: true });

    const searchValue = search.trim();
    if (difficulty !== 'All') q = q.eq('difficulty', difficulty);
    if (source !== 'All') q = q.eq('source', source);
    if (searchValue) q = q.ilike('title', `%${searchValue}%`);

    const { data, error: queryError } = await q;

    if (queryError) {
      setQuestions([]);
      setError(queryError.message || 'Failed to load questions.');
      setLoading(false);
      return;
    }

    setQuestions(data || []);
    setLoading(false);
  }, [supabase, difficulty, source, search]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resultCount = questions.length;

  return (
    <div className="mx-auto w-full max-w-[var(--max-width)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Practice
        </h1>
        <p className="text-sm text-[var(--text-secondary)] sm:text-base">
          Browse coding questions cached in Supabase.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-sm)] sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Source</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)]"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
        <div>{loading ? 'Loading...' : `Showing ${resultCount} question${resultCount === 1 ? '' : 's'}`}</div>
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {!loading && !error && resultCount === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="text-3xl">📭</div>
          <div className="mt-3 text-base font-semibold text-[var(--text-primary)]">No questions found</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            Try clearing filters or searching with a different keyword.
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {questions.map((q) => {
          const tags = Array.isArray(q.tags) ? q.tags : [];

          return (
            <div
              key={q.id}
              className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-sm)] transition hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-glow)]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug text-[var(--text-primary)]">
                    {q.title}
                  </h3>
                  <span className={difficultyBadgeClass(q.difficulty)}>{q.difficulty}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                    {sourceLabel(q.source)}
                  </span>

                  {tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                      title={tag}
                    >
                      {tag}
                    </span>
                  ))}

                  {tags.length > 4 && (
                    <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                      +{tags.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
