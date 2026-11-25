'use client';

import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthProvider';
import { getDisplayName } from '@/lib/avatar';
import { useStreak } from '@/hooks/useStreak';
import { BADGES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    HiBookmark,
    HiCalendar, HiCheckCircle,
    HiCode,
    HiFire,
    HiPencil, HiSave,
    HiStar,
    HiX,
    HiXCircle
} from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

export default function ProfilePage() {
  const supabase = createClient();
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const { current: currentStreak, longest: longestStreak } = useStreak(user?.id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [recentSubs, setRecentSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [streakDates, setStreakDates] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [solvedByDifficulty, setSolvedByDifficulty] = useState({ Easy: 0, Medium: 0, Hard: 0 });
  const [contestHistory, setContestHistory] = useState([]);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadSubs() {
      try {
        const { data } = await supabase
          .from('judge_submissions')
          .select('id, language, verdict, runtime_ms, created_at, coding_problems(title, difficulty)')
          .eq('user_id', user.id)
          .eq('kind', 'submit')
          .order('created_at', { ascending: false })
          .limit(10);
        if (!cancelled) setRecentSubs(data || []);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        if (!cancelled) setSubsLoading(false);
      }
    }

    async function loadStreaks() {
      try {
        const { data } = await supabase
          .from('streaks')
          .select('activity_date')
          .eq('user_id', user.id)
          .order('activity_date', { ascending: false })
          .limit(30);
        if (!cancelled) setStreakDates((data || []).map((s) => s.activity_date));
      } catch (err) {
        console.error('Failed to load streaks:', err);
      }
    }

    async function loadBookmarks() {
      try {
        const res = await fetch('/api/bookmarks');
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setBookmarks(body.bookmarks || []);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        if (!cancelled) setBookmarksLoading(false);
      }
    }

    async function loadSolved() {
      try {
        // Counted from server-written verdicts, one per distinct problem.
        const { data } = await supabase
          .from('judge_submissions')
          .select('problem_id, coding_problems(difficulty)')
          .eq('user_id', user.id)
          .eq('kind', 'submit')
          .eq('verdict', 'accepted')
          .limit(1000);
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        const seen = new Set();
        (data || []).forEach((row) => {
          if (seen.has(row.problem_id)) return;
          seen.add(row.problem_id);
          const d = row.coding_problems?.difficulty;
          if (d in counts) counts[d] += 1;
        });
        if (!cancelled) setSolvedByDifficulty(counts);
      } catch (err) {
        console.error('Failed to load solved counts:', err);
      }
    }

    async function loadContests() {
      try {
        const { data } = await supabase
          .from('leaderboard_entries')
          .select('score, problems_solved, last_submission_at, contests(id, title, start_time)')
          .eq('user_id', user.id)
          .order('last_submission_at', { ascending: false })
          .limit(10);
        if (!cancelled) setContestHistory((data || []).filter((row) => row.contests));
      } catch (err) {
        console.error('Failed to load contest history:', err);
      } finally {
        if (!cancelled) setContestsLoading(false);
      }
    }

    loadSubs();
    loadStreaks();
    loadBookmarks();
    loadSolved();
    loadContests();
    return () => { cancelled = true; };
  }, [user, supabase]);

  const handleSave = async () => {
    if (!form.full_name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
      });
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not export your data');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eduorbit-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete your account');
      window.location.href = '/api/auth/signout';
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  };

  if (authLoading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  if (!user) {
    return (
      <div className="profile animate-fade-in">
        <div className="loading-container"><p>Please sign in to view your profile.</p></div>
      </div>
    );
  }

  const joinedAt = profile?.created_at || user.created_at;
  const joinDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : null;
  const solvedTotal = solvedByDifficulty.Easy + solvedByDifficulty.Medium + solvedByDifficulty.Hard;
  const userBadges = profile?.badges || [];
  const allBadges = BADGES.ALL.map((b) => ({ ...b, earned: userBadges.includes(b.id) }));

  // Generate streak calendar (last 30 days)
  const today = new Date();
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const active = streakDates.includes(dateStr);
    return { date: d, dateStr, active };
  });

  return (
    <div className="profile animate-fade-in">
      {/* Header Card */}
      <div className="card profile__hero">
        <div className="flex gap-lg" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar user={user} profile={profile} size={96} className="profile__avatar" />

          <div style={{ flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <input className="input" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                <textarea className="input" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2} />
                <div className="flex gap-sm">
                  <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
                    <HiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}><HiX size={14} /> Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>{getDisplayName(user, profile)}</h2>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}><HiPencil size={14} /></button>
                </div>
                {profile?.username && <p className="text-muted">@{profile.username}</p>}
                {profile?.bio && <p className="text-sm" style={{ marginTop: 'var(--space-xs)', color: 'var(--text-secondary)' }}>{profile.bio}</p>}
                <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>{user.email}</p>
                {joinDate && <p className="text-sm text-muted">Joined {joinDate}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-overview">
        <div className="card profile-points">
          <HiStar size={28} aria-hidden="true" />
          <div>
            <div className="profile-points__value">{profile?.total_points || 0}</div>
            <div className="profile-points__label">Total points</div>
          </div>
        </div>
        {[
          { icon: HiCode, label: 'Solved', value: profile?.problems_solved || 0, tone: 'accent' },
          { icon: HiFire, label: 'Current streak', value: `${profile?.current_streak ?? currentStreak ?? 0}d`, tone: 'danger' },
          { icon: HiTrophy, label: 'Longest streak', value: `${profile?.longest_streak ?? longestStreak ?? 0}d`, tone: 'success' },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className={`card profile-stat profile-stat--${tone}`}>
            <Icon size={22} aria-hidden="true" />
            <div className="profile-stat__value">{value}</div>
            <div className="profile-stat__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Solved by difficulty */}
      <section className="card" aria-labelledby="solved-title">
        <h2 id="solved-title" className="profile-section-title"><HiCode size={18} aria-hidden="true" /> Problems solved</h2>
        <dl className="profile-difficulty">
          {[
            ['Easy', 'var(--success)'],
            ['Medium', 'var(--warning)'],
            ['Hard', 'var(--danger)'],
          ].map(([label, color]) => (
            <div key={label} className="profile-difficulty__row">
              <dt>{label}</dt>
              <dd>
                <span className="profile-difficulty__bar" aria-hidden="true">
                  <span style={{ width: `${solvedTotal ? (solvedByDifficulty[label] / solvedTotal) * 100 : 0}%`, background: color }} />
                </span>
                <span className="profile-difficulty__count">{solvedByDifficulty[label]}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Streak Calendar */}
      <section className="card" aria-labelledby="streak-title">
        <h2 id="streak-title" className="profile-section-title"><HiCalendar size={18} aria-hidden="true" /> Activity (last 30 days)</h2>
        <ul className="streak-grid" aria-label={`${calendarDays.filter((d) => d.active).length} active days in the last 30`}>
          {calendarDays.map(({ dateStr, active, date }) => (
            <li
              key={dateStr}
              title={`${date.toLocaleDateString()}${active ? ' - active' : ''}`}
              className={`streak-day ${active ? 'streak-day--active' : ''}`}
            >
              <span className="sr-only">{date.toLocaleDateString()}: {active ? 'active' : 'no activity'}</span>
            </li>
          ))}
        </ul>
        <p className="streak-legend">
          <span className="streak-legend__swatch" aria-hidden="true" /> Active day
          <span className="streak-legend__swatch streak-legend__swatch--off" aria-hidden="true" /> No activity
        </p>
      </section>

      {/* Badges */}
      <section className="card" aria-labelledby="badges-title">
        <h2 id="badges-title" className="profile-section-title"><HiTrophy size={18} aria-hidden="true" /> Badges</h2>
        <ul className="profile-badges">
          {allBadges.map((b) => (
            <li
              key={b.id}
              className={`profile-badge ${b.earned ? 'profile-badge--earned' : 'profile-badge--locked'}`}
              title={b.description}
            >
              <span className="profile-badge__icon" aria-hidden="true">{b.icon}</span>
              <span className="profile-badge__name">{b.name}</span>
              <span className="profile-badge__state">{b.earned ? 'Earned' : 'Locked'}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Contest history */}
      <section className="card" aria-labelledby="contest-history-title" style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 id="contest-history-title" className="profile-section-title"><HiTrophy size={18} aria-hidden="true" /> Contest history</h2>
        {contestsLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : contestHistory.length === 0 ? (
          <p className="text-muted">No contests yet. <Link href="/contests">See upcoming contests</Link>.</p>
        ) : (
          <ul className="profile-contests">
            {contestHistory.map((row) => (
              <li key={row.contests.id} className="flex-between profile-contests__row">
                <Link href={`/contests/${row.contests.id}`}>{row.contests.title}</Link>
                <span className="text-sm text-muted">
                  {row.problems_solved} solved · {row.score} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bookmarked Problems */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-md)' }}><HiBookmark size={18} /> Bookmarked Problems</h3>
        {bookmarksLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : bookmarks.length === 0 ? (
          <p className="text-muted">No bookmarked problems. Bookmark problems to revisit them later!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {bookmarks.map((bm) => {
              const q = bm.coding_problems;
              if (!q) return null;
              const diffColor = { Easy: 'var(--success)', Medium: 'var(--warning)', Hard: 'var(--danger)' }[q.difficulty] || 'var(--text-muted)';
              return (
                <Link
                  key={bm.id}
                  href={`/coding/${q.slug || q.id}`}
                  style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: 'var(--space-sm)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontWeight: 500 }}>{q.title}</span>
                  <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <span className="badge" style={{ background: `${diffColor}22`, color: diffColor, fontSize: '0.75rem' }}>{q.difficulty}</span>
                    {q.category && <span className="badge badge--cat">{q.category}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-md)' }}><HiCode size={18} /> Recent Submissions</h3>
        {subsLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : recentSubs.length === 0 ? (
          <p className="text-muted">No submissions yet. Start solving!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {recentSubs.map((s) => (
              <div key={s.id} className="flex-between" style={{ padding: 'var(--space-sm)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  {s.verdict === 'accepted' ?
                    <HiCheckCircle size={16} color="var(--success)" /> :
                    <HiXCircle size={16} color="var(--danger)" />
                  }
                  <span>{s.coding_problems?.title || 'Problem'}</span>
                  <span className="text-sm text-muted">{s.verdict.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex gap-sm text-sm text-muted">
                  <span>{s.language}</span>
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data and privacy */}
      <section className="card" aria-labelledby="privacy-title" style={{ marginTop: 'var(--space-xl)' }}>
        <h2 id="privacy-title" className="profile-section-title">Your data</h2>
        <p className="text-sm text-muted">
          Download a copy of the personal data we hold about you, or delete your account permanently.
          See the <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <div className="flex gap-sm" style={{ marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Preparing...' : 'Download my data'}
          </button>
          {!deleteOpen && (
            <button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteOpen(true)}>
              Delete my account
            </button>
          )}
        </div>
        {deleteOpen && (
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <p className="text-sm">
              This permanently deletes your profile, submissions, progress and study data. It cannot be undone.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              className="input"
              aria-label="Type DELETE to confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
            />
            <div className="flex gap-sm">
              <button
                className="btn btn--sm"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete permanently'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
