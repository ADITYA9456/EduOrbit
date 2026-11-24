'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { HiPause, HiPlay, HiStop } from 'react-icons/hi';

export const formatClock = (total) => {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const ERRORS = {
  session_already_open: 'A session is already open. Stop it first.',
  no_open_session: 'There is no open session.',
  no_running_session: 'The timer is not running.',
  no_paused_session: 'The timer is not paused.',
};
const friendly = (error) => ERRORS[Object.keys(ERRORS).find((k) => error?.message?.includes(k))] || 'Something went wrong. Please try again.';

// The server keeps the clock. This component asks it for the elapsed time and only ticks the display.
export default function StudyTimer({ initial, disabled, onChange }) {
  const supabase = createClient();
  const [session, setSession] = useState(initial || null);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const baseRef = useRef({ seconds: initial?.elapsed_seconds || 0, at: Date.now() });

  useEffect(() => {
    baseRef.current = { seconds: session?.elapsed_seconds || 0, at: Date.now() };
    setNow(Date.now());
  }, [session]);

  useEffect(() => {
    if (session?.status !== 'running') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session?.status]);

  const elapsed = session
    ? baseRef.current.seconds + (session.status === 'running' ? (now - baseRef.current.at) / 1000 : 0)
    : 0;

  const refresh = async () => {
    const { data } = await supabase.rpc('study_current');
    setSession(data?.[0] || null);
  };

  const run = async (fn, okMessage) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) throw result.error;
      await refresh();
      if (okMessage) toast.success(typeof okMessage === 'function' ? okMessage(result.data) : okMessage);
      onChange?.();
    } catch (err) {
      toast.error(friendly(err));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const start = () => run(() => supabase.rpc('study_start', { p_topic: topic.trim() }), 'Timer started');
  const pause = () => run(() => supabase.rpc('study_pause'), 'Paused');
  const resume = () => run(() => supabase.rpc('study_resume'));
  const stop = () =>
    run(
      () => supabase.rpc('study_stop', { p_tz: timeZone() }),
      (secs) => (secs ? `Saved ${Math.round(secs / 60)} min of focus` : 'Under a minute, so nothing was saved')
    );

  return (
    <section className="card dash-timer" aria-label="Study timer">
      <h2 className="dash-card__title">Focus timer</h2>
      <div className="dash-timer__clock" role="timer" aria-live="off">{formatClock(elapsed)}</div>
      {session ? (
        <p className="text-sm text-muted">
          {session.topic ? `${session.topic} · ` : ''}{session.status === 'paused' ? 'Paused' : 'Running'}
        </p>
      ) : (
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="timer-topic" className="sr-only">What are you studying?</label>
          <input
            id="timer-topic" className="input" placeholder="What are you studying? (optional)"
            maxLength={80} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={disabled || busy}
          />
        </div>
      )}
      <div className="dash-timer__actions">
        {!session && (
          <button type="button" className="btn btn--primary" onClick={start} disabled={disabled || busy}>
            <HiPlay size={16} aria-hidden="true" /> Start
          </button>
        )}
        {session?.status === 'running' && (
          <button type="button" className="btn btn--ghost" onClick={pause} disabled={busy}>
            <HiPause size={16} aria-hidden="true" /> Pause
          </button>
        )}
        {session?.status === 'paused' && (
          <button type="button" className="btn btn--primary" onClick={resume} disabled={busy}>
            <HiPlay size={16} aria-hidden="true" /> Resume
          </button>
        )}
        {session && (
          <button type="button" className="btn btn--danger" onClick={stop} disabled={busy}>
            <HiStop size={16} aria-hidden="true" /> Stop &amp; save
          </button>
        )}
      </div>
    </section>
  );
}
