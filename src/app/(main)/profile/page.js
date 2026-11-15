'use client';

import { useAuth } from '@/context/AuthProvider';
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
  const { user, profile, updateProfile } = useAuth();
  const { current: currentStreak, longest: longestStreak } = useStreak(user?.id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [recentSubs, setRecentSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [streakDates, setStreakDates] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);

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
    async function loadRecent() {
      setSubsLoading(true);
      const { data } = await supabase
        .from('submissions')
        .select('*, coding_problems(title, difficulty)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentSubs(data || []);
      setSubsLoading(false);

      // Load streak dates
      const { data: streaks } = await supabase
        .from('streaks')
        .select('activity_date')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false })
        .limit(30);
      setStreakDates((streaks || []).map((s) => s.activity_date));

      // Load bookmarked problems
      setBookmarksLoading(true);
      const bmRes = await fetch('/api/bookmarks');
      if (bmRes.ok) {
        const bmData = await bmRes.json();
        setBookmarks(bmData.bookmarks || []);
      }
      setBookmarksLoading(false);
    }
    loadRecent();
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

  if (!user) {
    return (
      <div className="profile animate-fade-in">
        <div className="loading-container"><p>Please sign in to view your profile.</p></div>
      </div>
    );
  }

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
          <div className="profile__avatar" style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '2rem',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (profile?.full_name || 'U')[0].toUpperCase()
            )}
          </div>

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
                  <h2 style={{ margin: 0 }}>{profile?.full_name || 'User'}</h2>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}><HiPencil size={14} /></button>
                </div>
                {profile?.username && <p className="text-muted">@{profile.username}</p>}
                {profile?.bio && <p className="text-sm" style={{ marginTop: 'var(--space-xs)', color: 'var(--text-secondary)' }}>{profile.bio}</p>}
                <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>{user.email}</p>
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
                  {s.status === 'accepted' ?
                    <HiCheckCircle size={16} color="var(--success)" /> :
                    <HiXCircle size={16} color="var(--danger)" />
                  }
                  <span>{s.coding_problems?.title || 'Problem'}</span>
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
    </div>
  );
}
