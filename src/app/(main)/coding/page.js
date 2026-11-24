'use client';

import DailyChallengeCard from '@/components/coding/DailyChallengeCard';
import DifficultyBadge from '@/components/coding/DifficultyBadge';
import FilterChips from '@/components/coding/FilterChips';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthProvider';
import { useRealtimeProgress } from '@/hooks/useRealtime';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    HiBookmark,
    HiCheckCircle,
    HiCode,
    HiFire,
    HiLightningBolt,
    HiSearch,
    HiStar,
} from 'react-icons/hi';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const TYPE_LABELS = { code: 'Code', mcq: 'MCQ', sql: 'SQL', project: 'Project' };
const PAGE_SIZE = 20;

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: d, tone: d === 'All' ? undefined : d.toLowerCase() }));
const COLUMNS = [
  { key: 'num', label: '#', className: 'col-hide-sm' },
  { key: 'title', label: 'Title' },
  { key: 'cat', label: 'Category', className: 'col-hide-sm' },
  { key: 'type', label: 'Type', className: 'col-hide-sm' },
  { key: 'diff', label: 'Difficulty' },
  { key: 'pts', label: 'Points', className: 'col-hide-sm' },
  { key: 'status', label: 'Status' },
  { key: 'bm', label: 'Bookmark' },
];

export default function CodingPracticePage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [problems, setProblems] = useState([]);
  const [meta, setMeta] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [type, setType] = useState('All');
  const [tag, setTag] = useState('All');
  const [solvedMap, setSolvedMap] = useState({});
  const [bookmarkSet, setBookmarkSet] = useState(new Set());
  const [dailyChallenge, setDailyChallenge] = useState(null);

  // Categories, types and tags come from the data itself, so the filters always match what exists.
  const categoryTabs = useMemo(() => {
    const names = [...new Set(meta.map((m) => m.category).filter(Boolean))].sort();
    return [{ id: 'All', label: 'All' }, ...names.map((c) => ({ id: c, label: c }))];
  }, [meta]);
  const typeOptions = useMemo(() => {
    const names = [...new Set(meta.map((m) => m.type).filter(Boolean))];
    return names.length > 1
      ? [{ value: 'All', label: 'All' }, ...names.map((t) => ({ value: t, label: TYPE_LABELS[t] || t }))]
      : [];
  }, [meta]);
  const tagList = useMemo(() => [...new Set(meta.flatMap((m) => m.tags || []))].sort(), [meta]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Any filter change returns to the first page.
  useEffect(() => { setPage(0); }, [category, difficulty, type, tag, debouncedSearch]);

  // Lightweight list of every problem: drives the filters and the progress totals.
  useEffect(() => {
    supabase
      .from('coding_problems')
      .select('id, category, difficulty, type, tags')
      .then(({ data }) => setMeta(data || []));
  }, [supabase]);

  const loadProblems = useCallback(async () => {
    setLoading(true);
    setError('');

    let q = supabase
      .from('coding_problems')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .order('title', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (category !== 'All') q = q.eq('category', category);
    if (difficulty !== 'All') q = q.eq('difficulty', difficulty);
    if (type !== 'All') q = q.eq('type', type);
    if (tag !== 'All') q = q.contains('tags', [tag]);
    if (debouncedSearch) q = q.ilike('title', `%${debouncedSearch.replace(/[%_\\]/g, '')}%`);

    const { data: probs, count, error: probsError } = await q;
    if (probsError) {
      console.warn('Error loading problems:', probsError.message);
      setProblems([]);
      setTotal(0);
      setError('Could not load problems. Check your connection and try again.');
    } else {
      setProblems(probs || []);
      setTotal(count ?? (probs || []).length);
    }
    setLoading(false);
  }, [supabase, page, category, difficulty, type, tag, debouncedSearch]);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setSolvedMap({});
      setBookmarkSet(new Set());
      return;
    }
    const [progressRes, bookmarkRes] = await Promise.all([
      supabase.from('user_progress').select('question_id, status').eq('user_id', user.id),
      supabase.from('bookmarks').select('question_id').eq('user_id', user.id),
    ]);
    const map = {};
    (progressRes.data || []).forEach((p) => {
      if (p.status === 'solved') map[p.question_id] = 'solved';
      else if (!map[p.question_id]) map[p.question_id] = 'attempted';
    });
    setSolvedMap(map);
    setBookmarkSet(new Set((bookmarkRes.data || []).map((b) => b.question_id)));
  }, [supabase, user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  useEffect(() => {
    fetch('/api/daily-challenge')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.challenge) setDailyChallenge(data.challenge); })
      .catch(() => {});
  }, []);

  // Realtime progress updates
  useRealtimeProgress(user?.id, useCallback(() => {
    loadUserData();
  }, [loadUserData]));

  const stats = useMemo(() => {
    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
    let totalSolved = 0;
    meta.forEach((m) => {
      if (solvedMap[m.id] === 'solved') {
        totalSolved++;
        byDifficulty[m.difficulty] = (byDifficulty[m.difficulty] || 0) + 1;
      }
    });
    return { totalSolved, byDifficulty };
  }, [meta, solvedMap]);
  const toggleBookmark = async (e, questionId) => {
    e.stopPropagation();
    if (!user) return toast.error('Sign in to bookmark');

    let data;
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update bookmark');
    } catch (err) {
      return toast.error(err.message);
    }
    if (data.bookmarked) {
      setBookmarkSet((prev) => new Set([...prev, questionId]));
      toast.success('Bookmarked!');
    } else {
      setBookmarkSet((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      toast.success('Bookmark removed');
    }
  };

  const completionPct = meta.length > 0 ? Math.round((stats.totalSolved / meta.length) * 100) : 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="coding animate-fade-in">
      <PageHeader
        title="Coding Practice"
        description="Sharpen your skills with curated challenges across multiple categories."
      />

      <div className={`coding__top ${dailyChallenge ? 'coding__top--with-daily' : ''}`}>
        <div className="coding__stats-row">
          {[
            { icon: HiCheckCircle, label: 'Solved', value: stats.totalSolved, color: 'var(--success)' },
            { icon: HiStar, label: 'Points', value: profile?.total_points || 0, color: 'var(--warning)' },
            { icon: HiFire, label: 'Streak', value: `${profile?.current_streak || 0}d`, color: 'var(--danger)' },
            { icon: HiLightningBolt, label: 'Completion', value: `${completionPct}%`, color: 'var(--accent-primary)' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card coding__stat-card">
              <Icon size={20} color={color} aria-hidden="true" />
              <div className="coding__stat-value" style={{ color }}>{value}</div>
              <div className="coding__stat-label">{label}</div>
            </div>
          ))}
        </div>
        <DailyChallengeCard challenge={dailyChallenge} />
      </div>

      {user && stats.totalSolved > 0 && (
        <div className="card coding__progress-bar-card">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <span className="text-sm" style={{ fontWeight: 600 }}>Progress by difficulty</span>
            <span className="text-sm text-muted">{stats.totalSolved} solved</span>
          </div>
          <div className="coding__progress-bar">
            {['Easy', 'Medium', 'Hard'].map((d) => stats.byDifficulty[d] > 0 && (
              <div
                key={d}
                className={`coding__progress-segment coding__progress-segment--${d.toLowerCase()}`}
                style={{ flex: stats.byDifficulty[d] }}
                title={`${d}: ${stats.byDifficulty[d]}`}
              />
            ))}
          </div>
          <div className="coding__legend">
            <span className="coding__legend-item coding__legend-item--easy">Easy: {stats.byDifficulty.Easy || 0}</span>
            <span className="coding__legend-item coding__legend-item--medium">Medium: {stats.byDifficulty.Medium || 0}</span>
            <span className="coding__legend-item coding__legend-item--hard">Hard: {stats.byDifficulty.Hard || 0}</span>
          </div>
        </div>
      )}

      {categoryTabs.length > 2 && <Tabs tabs={categoryTabs} value={category} onChange={setCategory} label="Category" />}

      <div className="filters-panel">
        <div className="filters-panel__search">
          <HiSearch size={18} aria-hidden="true" />
          <input
            className="input"
            type="search"
            aria-label="Search problems"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips label="Difficulty" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
        {typeOptions.length > 0 && <FilterChips label="Type" options={typeOptions} value={type} onChange={setType} />}
        {tagList.length > 0 && (
          <label className="filters-panel__tag">
            <span className="sr-only">Filter by tag</span>
            <select className="input" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
              <option value="All">All tags</option>
              {tagList.map((tg) => <option key={tg} value={tg}>{tg}</option>)}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : problems.length === 0 ? (
        <EmptyState
          icon={<HiCode size={48} />}
          title="No problems found"
          message={error || 'No coding problems match these filters.'}
          action={error ? <button type="button" className="btn btn--primary" onClick={loadProblems}>Try again</button> : undefined}
        />
      ) : (
        <Table caption="Coding problems" columns={COLUMNS} className="problem-table">
          {problems.map((p, i) => {
            const status = solvedMap[p.id];
            const bookmarked = bookmarkSet.has(p.id);
            const href = `/coding/${p.slug || p.id}`;
            return (
              <tr
                key={p.id}
                className={`problem-tr ${status === 'solved' ? 'problem-tr--solved' : ''}`}
                onClick={() => router.push(href)}
              >
                <td className="col-hide-sm problem-tr__num">{page * PAGE_SIZE + i + 1}</td>
                <td>
                  <Link href={href} className="table__primary problem-tr__link" onClick={(e) => e.stopPropagation()}>
                    {p.title}
                  </Link>
                  {p.tags?.length > 0 && (
                    <span className="problem-tr__tags">
                      {p.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge badge--tag">{tag}</span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="col-hide-sm">
                  <span className="badge badge--cat">{p.category}</span>
                </td>
                <td className="col-hide-sm">{TYPE_LABELS[p.type] || p.type}</td>
                <td><DifficultyBadge difficulty={p.difficulty} /></td>
                <td className="col-hide-sm problem-tr__pts">{p.points || 10}</td>
                <td>
                  {status === 'solved' ? (
                    <Badge tone="success"><HiCheckCircle size={14} aria-hidden="true" /> Solved</Badge>
                  ) : status === 'attempted' ? (
                    <Badge tone="warning">Attempted</Badge>
                  ) : (
                    <span className="text-muted"><span aria-hidden="true">—</span><span className="sr-only">Not attempted</span></span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className={`bookmark-btn ${bookmarked ? 'bookmark-btn--on' : ''}`}
                    aria-pressed={bookmarked}
                    aria-label={`${bookmarked ? 'Remove bookmark from' : 'Bookmark'} ${p.title}`}
                    onClick={(e) => toggleBookmark(e, p.id)}
                  >
                    <HiBookmark size={18} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {!loading && total > PAGE_SIZE && (
        <nav className="pagination" aria-label="Problem pages" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-sm text-muted" aria-live="polite">Page {page + 1} of {pageCount}</span>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}
