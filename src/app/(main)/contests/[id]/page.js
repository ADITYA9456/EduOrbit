'use client';

import DifficultyBadge from '@/components/coding/DifficultyBadge';
import EditorFrame from '@/components/coding/EditorFrame';
import { defineEduorbitThemes, useEditorTheme } from '@/components/coding/monacoTheme';
import Badge from '@/components/ui/Badge';
import CountdownTimer from '@/components/ui/CountdownTimer';
import Table from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthProvider';
import { CODING } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    HiCheckCircle,
    HiChevronLeft,
    HiClock,
    HiCode,
    HiLightningBolt,
    HiPlay,
    HiXCircle
} from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const VIEW_TABS = [
  { id: 'problems', label: 'Problems' },
  { id: 'leaderboard', label: 'Leaderboard' },
];

const LB_COLUMNS = [
  { key: 'rank', label: 'Rank' },
  { key: 'user', label: 'User' },
  { key: 'score', label: 'Score' },
  { key: 'last', label: 'Last submission' },
];

export default function ContestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const editorTheme = useEditorTheme();

  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Problem solving state
  const [activeProblem, setActiveProblem] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [view, setView] = useState('problems'); // problems | leaderboard

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch contest
      const { data: c } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

      if (c) {
        setContest(c);

        // Fetch contest problems
        const { data: cp } = await supabase
          .from('contest_problems')
          .select('*, coding_problems(*)')
          .eq('contest_id', id)
          .order('order_index');

        setProblems((cp || []).map((item) => ({
          ...item.coding_problems,
          points: item.points,
          order_index: item.order_index,
        })));

        // Fetch leaderboard
        const { data: lb } = await supabase
          .from('leaderboard_entries')
          .select('*, profiles(full_name, username, avatar_url)')
          .eq('contest_id', id)
          .order('score', { ascending: false })
          .order('last_submission_at', { ascending: true });

        setLeaderboard(lb || []);
      }
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  // Participation state for the signed-in user
  useEffect(() => {
    if (!user) { setJoined(false); return; }
    supabase
      .from('contest_participants')
      .select('contest_id')
      .eq('contest_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setJoined(!!data));
  }, [id, user, supabase]);

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

  const handleJoin = async () => {
    if (!user) return toast.error('Sign in to join');
    setJoining(true);
    const { error } = await supabase
      .from('contest_participants')
      .insert({ contest_id: id, user_id: user.id });
    setJoining(false);
    if (error && error.code !== '23505') return toast.error(error.message);
    setJoined(true);
    toast.success(error ? 'You are already registered' : 'Joined contest!');
  };

  const handleSelectProblem = (prob) => {
    setActiveProblem(prob);
    setCode(prob.starter_code?.[language] || `// Solve: ${prob.title}\n`);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!user) return toast.error('Sign in to submit');
    if (!code.trim()) return toast.error('Write some code first');

    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/coding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: activeProblem.id,
          contestId: id,
          language,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setResult(data);
      if (data.status === 'accepted') {
        toast.success('Accepted!');
      } else {
        const tr = data.testResults;
        toast.error(tr ? `Wrong answer: ${tr.passed}/${tr.total} tests passed` : 'Wrong answer');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!contest) return <div className="loading-container"><p>Contest not found</p></div>;

  const stateLabel = isUpcoming ? 'Starts in' : isActive ? 'Time remaining' : 'Contest ended';
  const myRank = user ? leaderboard.findIndex((e) => e.user_id === user.id) : -1;

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
            <span><HiClock size={14} aria-hidden="true" /> {contest.duration_minutes} min</span>
            <span><HiCode size={14} aria-hidden="true" /> {problems.length} problems</span>
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
            {!user ? (
              <Link href={`/login?redirect=/contests/${id}`} className="btn btn--primary btn--sm">Sign in to join</Link>
            ) : joined ? (
              <Badge tone="success"><HiCheckCircle size={14} aria-hidden="true" /> You&apos;re registered{myRank >= 0 ? ` · Rank #${myRank + 1}` : ''}</Badge>
            ) : isEnded ? (
              <Badge tone="neutral">You didn&apos;t take part</Badge>
            ) : (
              <button type="button" className="btn btn--primary btn--sm" onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining...' : isActive ? 'Join now' : 'Register'}
              </button>
            )}
          </div>
        </div>
      </section>

      <Tabs tabs={VIEW_TABS} value={view} onChange={setView} label="Contest sections" />

      {view === 'leaderboard' ? (
        leaderboard.length === 0 ? (
          <p className="text-muted contest-detail__empty">No submissions yet</p>
        ) : (
          <Table caption="Contest leaderboard" columns={LB_COLUMNS} className="contest-lb">
            {leaderboard.map((entry, i) => {
              const me = user && entry.user_id === user.id;
              return (
                <tr key={entry.id} className={me ? 'row--me' : undefined} aria-current={me ? 'true' : undefined}>
                  <td className="table__primary">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                  <td className="table__primary">
                    {entry.profiles?.full_name || entry.profiles?.username || 'User'}
                    {me && <Badge tone="accent" className="table__tag">You</Badge>}
                  </td>
                  <td className="lb-score">{entry.score}</td>
                  <td className="text-muted">{new Date(entry.last_submission_at).toLocaleTimeString()}</td>
                </tr>
              );
            })}
          </Table>
        )
      ) : (
        <div className={`contest-work ${activeProblem ? 'contest-work--open' : ''}`}>
          <ul className="contest-problems" aria-label="Contest problems">
            {problems.length === 0 && <li className="text-muted">No problems have been added yet.</li>}
            {problems.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={activeProblem?.id === p.id}
                  className={`contest-problem ${activeProblem?.id === p.id ? 'contest-problem--active' : ''}`}
                  onClick={() => handleSelectProblem(p)}
                >
                  <span className="contest-problem__main">
                    <span className="contest-problem__num">Problem {i + 1}</span>
                    <span className="contest-problem__title">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                  </span>
                  <span className="contest-problem__pts">{p.points} pts</span>
                </button>
              </li>
            ))}
          </ul>

          {activeProblem && (
            <div className="contest-editor">
              <div className="card contest-editor__desc">
                <h2>{activeProblem.title}</h2>
                <p>{activeProblem.description}</p>
                {activeProblem.examples?.length > 0 && (
                  <div className="contest-editor__examples">
                    {activeProblem.examples.map((ex, i) => (
                      <div key={i} className="example-card">
                        <p className="text-sm"><strong>Input:</strong> <code>{ex.input}</code></p>
                        <p className="text-sm"><strong>Output:</strong> <code>{ex.output}</code></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="editor-toolbar">
                <select
                  className="input"
                  aria-label="Language"
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value); setCode(activeProblem.starter_code?.[e.target.value] || ''); }}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                >
                  {CODING.LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className="btn btn--primary btn--sm" onClick={handleSubmit} disabled={submitting || !isActive}>
                  {submitting ? <><HiLightningBolt className="spin" size={14} /> Running...</> : <><HiPlay size={14} /> Submit</>}
                </button>
              </div>
              {!isActive && (
                <p className="contest-editor__lock" role="status">
                  {isUpcoming ? 'Submissions open when the contest starts.' : 'This contest has ended. The editor is read-only.'}
                </p>
              )}

              <EditorFrame className="contest-editor__frame">
                <MonacoEditor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  beforeMount={defineEduorbitThemes}
                  theme={editorTheme}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                    automaticLayout: true,
                    readOnly: !isActive,
                  }}
                />
              </EditorFrame>

              {result && (
                <div className={`card mcq__feedback ${result.status === 'accepted' ? 'card--success' : 'card--error'}`} role="status">
                  {result.status === 'accepted' ? <HiCheckCircle size={22} aria-hidden="true" /> : <HiXCircle size={22} aria-hidden="true" />}
                  <strong>{result.status === 'accepted' ? 'Accepted' : 'Wrong answer'}</strong>
                  {result.testResults && (
                    <span className="mcq__answer">{result.testResults.passed}/{result.testResults.total} passed</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
