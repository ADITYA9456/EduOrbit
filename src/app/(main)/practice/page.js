'use client';

// Practice Page
// - Reads cached questions from Supabase table: `questions`
// - Provides filters (difficulty/source) and title search
// - Shows today's daily challenge above the list

import DailyChallengeCard from '@/components/coding/DailyChallengeCard';
import DifficultyBadge from '@/components/coding/DifficultyBadge';
import FilterChips from '@/components/coding/FilterChips';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HiCode, HiSearch } from 'react-icons/hi';

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'].map((d) => ({
  value: d,
  label: d,
  tone: d === 'All' ? undefined : d.toLowerCase(),
}));
const SOURCE_OPTIONS = [
  { value: 'All', label: 'All sources' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'gfg', label: 'GFG' },
];

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
  const [dailyChallenge, setDailyChallenge] = useState(null);

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

  useEffect(() => {
    fetch('/api/daily-challenge')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.challenge) setDailyChallenge(data.challenge); })
      .catch(() => {});
  }, []);

  const resultCount = questions.length;

  return (
    <div className="coding animate-fade-in">
      <PageHeader
        title="Practice"
        description="Browse coding questions cached in Supabase."
      />

      <DailyChallengeCard challenge={dailyChallenge} />

      <div className="filters-panel">
        <div className="filters-panel__search">
          <HiSearch size={18} aria-hidden="true" />
          <input
            className="input"
            type="search"
            aria-label="Search questions by title"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips label="Difficulty" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
        <FilterChips label="Source" options={SOURCE_OPTIONS} value={source} onChange={setSource} />
      </div>

      <p className="text-sm text-muted" role="status">
        {loading ? 'Loading...' : `Showing ${resultCount} question${resultCount === 1 ? '' : 's'}`}
      </p>

      {error && <div className="form-error" role="alert">{error}</div>}

      {!loading && !error && resultCount === 0 && (
        <EmptyState
          icon={<HiCode size={48} />}
          title="No questions found"
          message="Try clearing filters or searching with a different keyword."
        />
      )}

      <div className="practice-grid">
        {questions.map((q) => {
          const tags = Array.isArray(q.tags) ? q.tags : [];
          return (
            <article key={q.id} className="practice-card">
              <div className="practice-card__head">
                <h3 className="practice-card__title">{q.title}</h3>
                <DifficultyBadge difficulty={q.difficulty} />
              </div>
              <div className="practice-card__tags">
                <span className="badge badge--neutral">{sourceLabel(q.source)}</span>
                {tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="badge badge--tag" title={tag}>{tag}</span>
                ))}
                {tags.length > 4 && <span className="badge badge--neutral">+{tags.length - 4}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
