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
import { useCallback, useEffect, useState } from 'react';
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

const CATEGORIES = ['All', 'DSA', 'Python', 'Java', 'SQL', 'WebDev'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const TYPES = ['All', 'code', 'mcq', 'sql', 'project'];
const TYPE_LABELS = { code: 'Code', mcq: 'MCQ', sql: 'SQL', project: 'Project' };
const CAT_ICONS = { DSA: '🧮', Python: '🐍', Java: '☕', SQL: '🗄️', WebDev: '🌐' };

const CATEGORY_TABS = CATEGORIES.map((c) => ({ id: c, label: c === 'All' ? c : `${CAT_ICONS[c]} ${c}` }));
const DIFFICULTY_OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: d, tone: d === 'All' ? undefined : d.toLowerCase() }));
const TYPE_OPTIONS = TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] || 'All' }));

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [type, setType] = useState('All');
  const [solvedMap, setSolvedMap] = useState({});
  const [bookmarkSet, setBookmarkSet] = useState(new Set());
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [stats, setStats] = useState({ totalSolved: 0, totalScore: 0, byDifficulty: {} });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    // Fetch all problems — use select('*') for schema flexibility
    let q = supabase
      .from('coding_problems')
      .select('*')
      .order('order_index', { ascending: true });

    if (category !== 'All') q = q.eq('category', category);
    if (difficulty !== 'All') q = q.eq('difficulty', difficulty);
    if (type !== 'All') q = q.eq('type', type);
    if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);

    const { data: probs, error: probsError } = await q;
    if (probsError) {
      console.warn('Error loading problems:', probsError.message);
      setProblems([]);
      setError(probsError.message || 'Failed to load coding problems.');
    } else {
      setProblems(probs || []);
    }

    // Fetch user data (gracefully handle missing tables)
    if (user) {
      const [progressRes, bookmarkRes] = await Promise.all([
        supabase
          .from('user_progress')
          .select('question_id, status, score')
          .eq('user_id', user.id)
          .then(r => r)
          .catch(() => ({ data: [] })),
        supabase
          .from('bookmarks')
          .select('question_id')
          .eq('user_id', user.id)
          .then(r => r)
          .catch(() => ({ data: [] })),
      ]);

      const map = {};
      const byDiff = { Easy: 0, Medium: 0, Hard: 0 };
      let totalScore = 0;
      let totalSolved = 0;

      (progressRes.data || []).forEach((p) => {
        if (p.status === 'solved') {
          map[p.question_id] = 'solved';
          totalSolved++;
          totalScore += p.score || 0;
        } else if (!map[p.question_id]) {
          map[p.question_id] = 'attempted';
        }
      });

      // Count difficulty breakdown from solved
      (probs || []).forEach((prob) => {
        if (map[prob.id] === 'solved') {
          byDiff[prob.difficulty] = (byDiff[prob.difficulty] || 0) + 1;
        }
      });

      setSolvedMap(map);
      setStats({ totalSolved, totalScore, byDifficulty: byDiff });
      setBookmarkSet(new Set((bookmarkRes.data || []).map((b) => b.question_id)));
    }

    setLoading(false);
  }, [supabase, category, difficulty, type, search, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load daily challenge (skip if API not ready)
  useEffect(() => {
    fetch('/api/daily-challenge')
      .then((r) => { if (r.ok) return r.json(); return null; })
      .then((data) => { if (data?.challenge) setDailyChallenge(data.challenge); })
      .catch(() => {});
  }, []);

  // Realtime progress updates
  useRealtimeProgress(user?.id, useCallback(() => {
    loadData();
  }, [loadData]));

  const toggleBookmark = async (e, questionId) => {
    e.stopPropagation();
    if (!user) return toast.error('Sign in to bookmark');

    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId }),
    });
    const data = await res.json();
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

  const totalProblems = problems.length;
  const completionPct = totalProblems > 0
    ? Math.round((stats.totalSolved / totalProblems) * 100)
    : 0;

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
            { icon: HiStar, label: 'Score', value: stats.totalScore, color: 'var(--warning)' },
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

      <Tabs tabs={CATEGORY_TABS} value={category} onChange={setCategory} label="Category" />

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
        <FilterChips label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} />
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : problems.length === 0 ? (
        <EmptyState
          icon={<HiCode size={48} />}
          title="No problems found"
          message={
            error
              ? `Could not load problems: ${error}. Make sure your Supabase database has the table 'coding_problems' and a public SELECT policy.`
              : 'No coding problems match these filters, or none have been added yet.'
          }
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
                <td className="col-hide-sm problem-tr__num">{i + 1}</td>
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
                  <span className="badge badge--cat">{CAT_ICONS[p.category] || '📁'} {p.category}</span>
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
    </div>
  );
}
