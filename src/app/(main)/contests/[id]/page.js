'use client';

import DifficultyBadge from '@/components/coding/DifficultyBadge';
import { verdictLabel } from '@/components/coding/judge/verdicts';
import RankTable from '@/components/leaderboard/RankTable';
import Badge from '@/components/ui/Badge';
import CountdownTimer from '@/components/ui/CountdownTimer';
import Table from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiChevronLeft, HiClock, HiCode } from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

const PAGE_SIZE = 25;
const REFRESH_MS = 20_000;

const VIEW_TABS = [
  { id: 'problems', label: 'Problems' },
  { id: 'standings', label: 'Standings' },
  { id: 'mine', label: 'My submissions' },
];

const MINE_COLUMNS = [
  { key: 'problem', label: 'Problem' },
  { key: 'verdict', label: 'Verdict' },
  { key: 'time', label: 'Time' },
];

export default function ContestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState('problems');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [me, setMe] = useState(null);
  const [page, setPage] = useState(0);
  const [standingsError, setStandingsError] = useState(null);
  const [mine, setMine] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: c } = await supabase.from('contests').select('*').eq('id', id).maybeSingle();
      if (cancelled) return;
      setContest(c || null);
      if (c) {
        const { data: cp } = await supabase
          .from('contest_problems')
          .select('points, order_index, coding_problems(id, slug, title, difficulty)')
          .eq('contest_id', id)
          .order('order_index');
        if (!cancelled) {
          setProblems((cp || []).filter((r) => r.coding_problems).map((r) => ({ ...r.coding_problems, points: r.points })));
        }
      }
      if (!cancelled) setLoading(false);
    }
    load().catch((err) => {
      console.error('Failed to load contest:', err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setJoined(false); return; }
    supabase
      .from('contest_participants')
      .select('contest_id')
      .eq('contest_id', id)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setJoined(!!data));
  }, [id, userId, authLoading, supabase]);

  // Re-evaluate upcoming / live / ended when the clock crosses start or end
  useEffect(() => {
    if (!contest) return undefined;
    const upcoming = [contest.start_time, contest.end_time]
      .map((t) => new Date(t).getTime())
      .filter((t) => t > Date.now());
    if (upcoming.length === 0) return undefined;
    const wait = Math.min(Math.min(...upcoming) - Date.now() + 250, 2 ** 31 - 1);
    const timer = setTimeout(() => setNow(Date.now()), wait);
    return () => clearTimeout(timer);
  }, [contest, now]);

  const isUpcoming = !!contest && now < new Date(contest.start_time).getTime();
  const isActive = !!contest && !isUpcoming && now <= new Date(contest.end_time).getTime();
  const isEnded = !!contest && now > new Date(contest.end_time).getTime();

  const loadStandings = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('contest_standings', {
        p_contest: id,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      setRows(data || []);
      setTotal(Number(data?.[0]?.total_count ?? 0));
      setStandingsError(null);
      if (userId) {
        const { data: mine1 } = await supabase.rpc('contest_my_standing', { p_contest: id });
        setMe(mine1?.[0] ?? null);
      } else {
        setMe(null);
      }
    } catch (err) {
      console.error('Failed to load standings:', err);
      setStandingsError(/function|schema cache/i.test(err.message || '')
        ? 'Standings are not set up on this database yet (migration 002 is missing).'
        : 'Could not load the standings.');
    }
  }, [supabase, id, page, userId]);

  useEffect(() => {
    if (view !== 'standings' && view !== 'problems') return undefined;
    loadStandings();
    if (!isActive) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') loadStandings(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [view, loadStandings, isActive]);

  const loadMine = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('contest_submissions')
      .select('id, problem_id, verdict, is_accepted, created_at')
      .eq('contest_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    setMine(data || []);
  }, [supabase, id, userId]);

  useEffect(() => { loadMine(); }, [loadMine, view]);

  const problemState = useMemo(() => {
    const state = {};
    mine.forEach((s) => {
      if (s.is_accepted) state[s.problem_id] = 'ok';
      else if (!state[s.problem_id]) state[s.problem_id] = 'try';
    });
    return state;
  }, [mine]);

  const titleById = useMemo(() => Object.fromEntries(problems.map((p) => [p.id, p.title])), [problems]);

  const handleJoin = async () => {
    if (!userId) return toast.error('Sign in to join');
    setJoining(true);
    const { error } = await supabase.from('contest_participants').insert({ contest_id: id, user_id: userId });
    setJoining(false);
    if (error && error.code !== '23505') {
      return toast.error(/contest_ended/.test(error.message) ? 'This contest has ended' : error.message);
    }
    setJoined(true);
    toast.success(error ? 'You are already registered' : 'You are registered');
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!contest) return <div className="loading-container"><p>Contest not found</p></div>;

  const stateLabel = isUpcoming ? 'Starts in' : isActive ? 'Time remaining' : 'Contest ended';
  const durationMin = Math.round((new Date(contest.end_time) - new Date(contest.start_time)) / 60000);
  const canSolve = joined && isActive;

  return (
    <div className="contest-detail animate-fade-in">
      <button className="btn btn--ghost btn--sm contest-detail__back" onClick={() => router.push('/contests')}>
        <HiChevronLeft size={16} /> Back to Contests
      </button>

      <section className={`contest-hero ${isActive ? 'contest-hero--live' : ''}`} aria-labelledby="contest-title">
        <div className="contest-hero__info">
          <Badge tone={isUpcoming ? 'medium' : isActive ? 'easy' : 'neutral'}>
            {isUpcoming ? 'Upcoming' : isActive ? 'Live' : 'Ended'}
          </Badge>
          <h1 id="contest-title" className="contest-hero__title"><HiTrophy size={24} aria-hidden="true" /> {contest.title}</h1>
          {contest.description && <p className="contest-hero__desc">{contest.description}</p>}
          <div className="contest-hero__meta">
            <span><HiClock size={14} aria-hidden="true" /> {durationMin} min</span>
            <span><HiCode size={14} aria-hidden="true" /> {problems.length} problems</span>
            <span>{contest.wrong_penalty_minutes ?? 10} min penalty per wrong attempt</span>
          </div>
        </div>

        <div className="contest-hero__side">
          <div className="contest-hero__clock">
            <span className="contest-hero__clock-label">{stateLabel}</span>
            {isUpcoming && <CountdownTimer targetDate={contest.start_time} />}
            {isActive && <CountdownTimer targetDate={contest.end_time} />}
            {isEnded && <span className="contest-hero__ended">{new Date(contest.end_time).toLocaleString()}</span>}
          </div>

          <div className="contest-hero__join" aria-live="polite">
            {!userId ? (
              <Link href={`/login?redirect=/contests/${id}`} className="btn btn--primary btn--sm">Sign in to join</Link>
            ) : joined ? (
              <Badge tone="success"><HiCheckCircle size={14} aria-hidden="true" /> Registered{me ? ` · Rank #${me.rank}` : ''}</Badge>
            ) : isEnded ? (
              <Badge tone="neutral">You didn&apos;t take part</Badge>
            ) : (
              <button type="button" className="btn btn--primary btn--sm" onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining…' : isActive ? 'Join now' : 'Register'}
              </button>
            )}
          </div>
        </div>
      </section>

      <Tabs tabs={VIEW_TABS} value={view} onChange={setView} label="Contest sections" />

      {view === 'problems' && (
        <>
          {!canSolve && (
            <p className="contest-lock" role="status">
              {isUpcoming && 'Problems open for submissions when the contest starts.'}
              {isActive && !joined && 'Register to submit solutions. You can open a problem to read it.'}
              {isEnded && 'This contest has ended. Submissions are closed, but you can still practise the problems.'}
            </p>
          )}
          <ul className="contest-problems" aria-label="Contest problems">
            {problems.length === 0 && <li className="text-muted">No problems have been added yet.</li>}
            {problems.map((p, i) => {
              const st = problemState[p.id];
              return (
                <li key={p.id}>
                  <Link
                    href={`/coding/${p.slug || p.id}${isActive ? `?contest=${id}` : ''}`}
                    className="contest-problem"
                  >
                    <span className="contest-problem__main">
                      <span className="contest-problem__num">Problem {i + 1}</span>
                      <span className="contest-problem__title">{p.title}</span>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </span>
                    <span className="contest-problem__pts">
                      {st === 'ok' && <span className="contest-problem__state contest-problem__state--ok">Solved · </span>}
                      {st === 'try' && <span className="contest-problem__state contest-problem__state--try">Attempted · </span>}
                      {p.points} pts
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {view === 'standings' && (
        standingsError ? (
          <p className="text-muted contest-detail__empty">{standingsError}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted contest-detail__empty">No one has registered yet.</p>
        ) : (
          <RankTable
            variant="contest"
            caption="Contest standings"
            rows={rows}
            me={me}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPage={(p) => setPage(Math.max(0, p))}
          />
        )
      )}

      {view === 'mine' && (
        !userId ? (
          <p className="text-muted contest-detail__empty">Sign in to see your submissions.</p>
        ) : mine.length === 0 ? (
          <p className="text-muted contest-detail__empty">You have not submitted anything in this contest.</p>
        ) : (
          <Table caption="Your contest submissions" columns={MINE_COLUMNS}>
            {mine.map((s) => (
              <tr key={s.id}>
                <td className="table__primary">{titleById[s.problem_id] || 'Problem'}</td>
                <td>{verdictLabel(s.verdict)}</td>
                <td className="text-muted">{new Date(s.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </Table>
        )
      )}
    </div>
  );
}
