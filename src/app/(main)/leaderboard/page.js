'use client';

import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthProvider';
import { useRealtimeLeaderboard } from '@/hooks/useRealtime';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import { HiFire } from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

const SORTS = [
  { id: 'total_points', label: 'Points' },
  { id: 'problems_solved', label: 'Solved' },
  { id: 'current_streak', label: 'Streak' },
];

const SORT_UNITS = { total_points: 'pts', problems_solved: 'solved', current_streak: 'day streak' };

const COLUMNS = [
  { key: 'rank', label: 'Rank' },
  { key: 'user', label: 'User' },
  { key: 'points', label: 'Points' },
  { key: 'solved', label: 'Solved' },
  { key: 'streak', label: 'Streak' },
  { key: 'badges', label: 'Badges' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function displayName(u) {
  return u.full_name || u.username || 'User';
}

function Avatar({ user }) {
  return (
    <span className="lb-avatar" aria-hidden="true">
      {user.avatar_url ? <img src={user.avatar_url} alt="" /> : displayName(user)[0].toUpperCase()}
    </span>
  );
}

function Rank({ index }) {
  return index < 3
    ? <><span aria-hidden="true">{MEDALS[index]}</span><span className="sr-only">Rank {index + 1}</span></>
    : <>{index + 1}</>;
}

export default function LeaderboardPage() {
  const supabase = createClient();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('total_points'); // total_points | problems_solved | current_streak

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, total_points, problems_solved, current_streak, badges')
        .order(sortBy, { ascending: false })
        .limit(100);

      setUsers(data || []);
      setLoading(false);
    }
    load();
  }, [sortBy, supabase]);

  // Live leaderboard updates
  useRealtimeLeaderboard(useCallback((payload) => {
    if (payload.eventType === 'UPDATE' && payload.new) {
      setUsers((prev) => {
        const updated = prev.map((u) => u.id === payload.new.id ? { ...u, ...payload.new } : u);
        return updated.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
      });
    }
  }, [sortBy]));

  const myIndex = user ? users.findIndex((u) => u.id === user.id) : -1;

  return (
    <div className="leaderboard animate-fade-in">
      <PageHeader
        title="Leaderboard"
        description={myIndex >= 0 ? `You are ranked #${myIndex + 1} of ${users.length}.` : 'Top performers in the community.'}
      />

      <Tabs tabs={SORTS} value={sortBy} onChange={setSortBy} label="Sort leaderboard by" />

      {loading ? (
        <div className="route-loading">
          <div className="skeleton route-loading__card" />
          <div className="skeleton route-loading__card" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={<HiTrophy size={48} />} title="No users yet" message="Be the first to earn points!" />
      ) : (
        <>
          <div className="lb-desktop">
            <Table caption="Leaderboard rankings" columns={COLUMNS} className="lb-table">
              {users.map((u, i) => {
                const me = u.id === user?.id;
                return (
                  <tr key={u.id} className={me ? 'row--me' : undefined} aria-current={me ? 'true' : undefined}>
                    <td className="lb-rank"><Rank index={i} /></td>
                    <td>
                      <span className="lb-user">
                        <Avatar user={u} />
                        <span className="table__primary">{displayName(u)}</span>
                        {me && <Badge tone="accent">You</Badge>}
                      </span>
                    </td>
                    <td className="lb-score">{u.total_points ?? 0}</td>
                    <td>{u.problems_solved ?? 0}</td>
                    <td>
                      {u.current_streak > 0
                        ? <span className="lb-streak"><HiFire size={14} aria-hidden="true" /> {u.current_streak}</span>
                        : <span className="text-muted"><span aria-hidden="true">—</span><span className="sr-only">No streak</span></span>}
                    </td>
                    <td>{u.badges?.length || 0}</td>
                  </tr>
                );
              })}
            </Table>
          </div>

          <ol className="lb-mobile" aria-label="Leaderboard rankings">
            {users.map((u, i) => {
              const me = u.id === user?.id;
              return (
                <li key={u.id} className={`lb-card ${me ? 'lb-card--me' : ''}`} aria-current={me ? 'true' : undefined}>
                  <span className="lb-card__rank"><Rank index={i} /></span>
                  <Avatar user={u} />
                  <div className="lb-card__body">
                    <span className="lb-card__name">
                      {displayName(u)}
                      {me && <Badge tone="accent">You</Badge>}
                    </span>
                    <span className="lb-card__stats">
                      <span>{u.problems_solved ?? 0} solved</span>
                      {u.current_streak > 0 && (
                        <span className="lb-streak"><HiFire size={12} aria-hidden="true" /> {u.current_streak}d</span>
                      )}
                      <span>{u.badges?.length || 0} badges</span>
                    </span>
                  </div>
                  <span className="lb-card__points">
                    {u[sortBy] ?? 0}<small>{SORT_UNITS[sortBy]}</small>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
