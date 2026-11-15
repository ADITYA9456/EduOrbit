'use client';

import Badge from '@/components/ui/Badge';
import CountdownTimer from '@/components/ui/CountdownTimer';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCalendar, HiChevronRight, HiClock, HiUsers } from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

function getContestStatus(contest) {
  const now = new Date();
  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  return 'ended';
}

const STATUS_LABELS = {
  upcoming: { label: 'Upcoming', tone: 'medium', icon: HiClock },
  active: { label: 'Live', tone: 'easy', icon: HiTrophy },
  ended: { label: 'Ended', tone: 'neutral', icon: HiCalendar },
};

const FILTER_TABS = ['all', 'active', 'upcoming', 'ended'].map((f) => ({
  id: f,
  label: f.charAt(0).toUpperCase() + f.slice(1),
}));

export default function ContestsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();

  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | upcoming | ended

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('contests')
        .select('*, contest_participants(count)')
        .order('start_time', { ascending: false });

      setContests(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = contests.filter((c) => {
    if (filter === 'all') return true;
    return getContestStatus(c) === filter;
  });

  const handleJoin = async (contestId) => {
    if (!user) return toast.error('Sign in to join');
    try {
      const { error } = await supabase
        .from('contest_participants')
        .insert({ contest_id: contestId, user_id: user.id });
      if (error) throw error;
      toast.success('Joined contest!');
      router.push(`/contests/${contestId}`);
    } catch (err) {
      if (err.code === '23505') {
        // Already joined
        router.push(`/contests/${contestId}`);
      } else {
        toast.error(err.message);
      }
    }
  };

  return (
    <div className="contests animate-fade-in">
      <PageHeader title="Contests" description="Compete with others and climb the leaderboard." />

      <Tabs tabs={FILTER_TABS} value={filter} onChange={setFilter} label="Filter contests by status" />

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HiTrophy size={48} />}
          title="No contests found"
          message={filter === 'all' ? 'No contests have been created yet.' : `No ${filter} contests at the moment.`}
        />
      ) : (
        <div className="contests__grid">
          {filtered.map((contest) => {
            const status = getContestStatus(contest);
            const info = STATUS_LABELS[status];
            const Icon = info.icon;
            const participantCount = contest.contest_participants?.[0]?.count || 0;
            const action = status === 'active' ? 'Join now' : status === 'upcoming' ? 'Register' : 'View results';

            return (
              <article key={contest.id} className={`card contest-card contest-card--${status}`}>
                <div className="contest-card__top">
                  <Badge tone={info.tone}><Icon size={12} aria-hidden="true" /> {info.label}</Badge>
                  <span className="contest-card__count">
                    <HiUsers size={14} aria-hidden="true" /> {participantCount}<span className="sr-only"> participants</span>
                  </span>
                </div>

                <h2 className="contest-card__title">{contest.title}</h2>
                <p className="contest-card__desc">{contest.description?.slice(0, 120) || 'No description'}</p>

                <dl className="contest-card__facts">
                  <div><dt>Duration</dt><dd>{contest.duration_minutes} min</dd></div>
                  <div><dt>Start</dt><dd>{new Date(contest.start_time).toLocaleString()}</dd></div>
                </dl>

                {status === 'upcoming' && (
                  <div className="contest-card__clock">
                    <span className="contest-card__clock-label">Starts in</span>
                    <CountdownTimer targetDate={contest.start_time} />
                  </div>
                )}

                {status === 'active' && (
                  <div className="contest-card__clock">
                    <span className="contest-card__clock-label">Ends in</span>
                    <CountdownTimer targetDate={contest.end_time} />
                  </div>
                )}

                <button
                  type="button"
                  className={`btn btn--sm contest-card__action ${status === 'active' ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => (status === 'ended' ? router.push(`/contests/${contest.id}`) : handleJoin(contest.id))}
                >
                  {action} <HiChevronRight size={14} aria-hidden="true" />
                  <span className="sr-only">: {contest.title}</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
