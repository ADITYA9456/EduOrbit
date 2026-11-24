'use client';

import StudyAssistant from '@/components/dashboard/StudyAssistant';
import StudyTimer from '@/components/dashboard/StudyTimer';
import DifficultyBadge from '@/components/coding/DifficultyBadge';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiClock, HiFire, HiLightningBolt, HiTrash } from 'react-icons/hi';
import './dashboard.css';

const minutes = (s) => Math.round(s / 60);
const fmtDuration = (s) => {
  const m = minutes(s);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
const weekday = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
const KIND_LABEL = { retry: 'Retry', strengthen: 'Weak topic', level_up: 'Level up', explore: 'New topic', start: 'Start here' };
const todayLocal = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const delta = (now, prev) => {
  if (!prev && !now) return 'no activity either week';
  if (!prev) return 'up from nothing last week';
  const pct = Math.round(((now - prev) / prev) * 100);
  return pct === 0 ? 'same as last week' : `${pct > 0 ? '+' : ''}${pct}% vs last week`;
};

export default function DashboardPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [goalForm, setGoalForm] = useState({ daily: '60', weekly: '5' });
  const [savingGoals, setSavingGoals] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planDate, setPlanDate] = useState(todayLocal());
  const [addingPlan, setAddingPlan] = useState(false);

  const load = useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/dashboard?tz=${encodeURIComponent(tz)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load your dashboard');
      setData(json);
      setGoalForm({ daily: String(json.goals.daily_minutes), weekly: String(json.goals.weekly_problems) });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const saveGoals = async (e) => {
    e.preventDefault();
    if (savingGoals) return;
    const daily = Number(goalForm.daily);
    const weekly = Number(goalForm.weekly);
    if (!Number.isInteger(daily) || daily < 5 || daily > 720) return toast.error('Daily goal must be 5 to 720 minutes');
    if (!Number.isInteger(weekly) || weekly < 1 || weekly > 100) return toast.error('Weekly goal must be 1 to 100 problems');
    setSavingGoals(true);
    const { error: err } = await supabase
      .from('study_goals')
      .upsert({ user_id: user.id, daily_minutes: daily, weekly_problems: weekly, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSavingGoals(false);
    if (err) return toast.error('Could not save your goals');
    toast.success('Goals saved');
    load();
  };

  const addPlan = async (title, problemId = null, due = planDate) => {
    const clean = title.trim();
    if (!clean) return toast.error('Describe what you plan to do');
    if (clean.length > 120) return toast.error('Keep it under 120 characters');
    if (!due) return toast.error('Pick a date');
    if (addingPlan) return;
    setAddingPlan(true);
    const { error: err } = await supabase.from('study_plan_items').insert({ user_id: user.id, title: clean, problem_id: problemId, due_date: due });
    setAddingPlan(false);
    if (err) return toast.error('Could not add to your plan');
    setPlanTitle('');
    toast.success('Added to your plan');
    load();
  };

  const togglePlan = async (item) => {
    const { error: err } = await supabase
      .from('study_plan_items')
      .update({ done: !item.done, done_at: item.done ? null : new Date().toISOString() })
      .eq('id', item.id);
    if (err) return toast.error('Could not update that item');
    load();
  };

  const removePlan = async (item) => {
    const { error: err } = await supabase.from('study_plan_items').delete().eq('id', item.id);
    if (err) return toast.error('Could not remove that item');
    load();
  };

  if (authLoading || (user && loading)) return <div className="loading-container"><div className="spinner" /></div>;
  if (!user) return null;

  if (error && !data) {
    return (
      <EmptyState
        title="Could not load your dashboard"
        message={error}
        action={<button type="button" className="btn btn--primary" onClick={() => { setLoading(true); load(); }}>Try again</button>}
      />
    );
  }

  const { streak, today, weekly, days, insights, plan, session, goals, totals } = data;
  const maxDay = Math.max(today.goalSeconds, ...days.slice(7).map((d) => d.seconds), 1);
  const todayStr = todayLocal();
  const acceptRate = (a, s) => (s ? `${Math.round((a / s) * 100)}%` : '–');

  const stats = [
    { icon: HiFire, label: 'Day streak', value: streak.current_streak, note: `Best ${streak.longest_streak}`, color: 'var(--danger)' },
    { icon: HiClock, label: 'Focus today', value: fmtDuration(today.studySeconds), note: `Goal ${goals.daily_minutes}m`, color: 'var(--accent-primary)' },
    { icon: HiLightningBolt, label: 'Solved this week', value: weekly.problemsSolved, note: `Goal ${weekly.goalProblems}`, color: 'var(--warning)' },
    { icon: HiCheckCircle, label: 'Total solved', value: totals.solved, note: `of ${totals.problems}`, color: 'var(--success)' },
  ];

  return (
    <div className="dash animate-fade-in">
      <PageHeader title="Dashboard" description="Your study time, goals, plan and practice suggestions, based on your real activity." />

      {data.needsMigration && (
        <div className="form-error" role="alert">
          The study tools need a database update that has not been applied to this deployment yet (migration 004). Timer, goals and planner will not save until it is.
        </div>
      )}

      <div className="dash__stats">
        {stats.map(({ icon: Icon, label, value, note, color }) => (
          <div key={label} className="card coding__stat-card">
            <Icon size={20} color={color} aria-hidden="true" />
            <div className="coding__stat-value" style={{ color }}>{value}</div>
            <div className="coding__stat-label">{label}</div>
            <div className="text-sm text-muted">{note}</div>
          </div>
        ))}
      </div>

      <div className="dash__grid">
        <StudyTimer initial={session} disabled={data.needsMigration} onChange={load} />

        <section className="card" aria-label="Last 7 days of focus time">
          <h2 className="dash-card__title">Focus, last 7 days</h2>
          <div className="dash-bars" role="img" aria-label={`Focus minutes: ${days.slice(7).map((d) => `${weekday(d.date)} ${minutes(d.seconds)}`).join(', ')}`}>
            {days.slice(7).map((d) => (
              <div key={d.date} className="dash-bars__col">
                <div className="dash-bars__track">
                  <div
                    className={`dash-bars__bar ${d.seconds >= today.goalSeconds ? 'dash-bars__bar--goal' : ''}`}
                    style={{ height: `${Math.max((d.seconds / maxDay) * 100, d.seconds ? 4 : 0)}%` }}
                  />
                </div>
                <span className="dash-bars__val">{minutes(d.seconds)}m</span>
                <span className={`dash-bars__label ${d.date === todayStr ? 'dash-bars__label--today' : ''}`}>{weekday(d.date)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-label="Weekly report">
          <h2 className="dash-card__title">This week</h2>
          <dl className="dash-report">
            <div><dt>Focus time</dt><dd>{fmtDuration(weekly.studySeconds)}<small>{delta(weekly.studySeconds, weekly.previousStudySeconds)}</small></dd></div>
            <div><dt>New problems solved</dt><dd>{weekly.problemsSolved} of {weekly.goalProblems} goal</dd></div>
            <div><dt>Submissions</dt><dd>{weekly.submissions}<small>{delta(weekly.submissions, weekly.previousSubmissions)}</small></dd></div>
            <div><dt>Acceptance rate</dt><dd>{acceptRate(weekly.accepted, weekly.submissions)}<small>last week {acceptRate(weekly.previousAccepted, weekly.previousSubmissions)}</small></dd></div>
          </dl>
        </section>

        <form className="card" onSubmit={saveGoals} aria-label="Goals">
          <h2 className="dash-card__title">Goals</h2>
          <div className="form-group">
            <label htmlFor="goal-daily">Daily focus (minutes)</label>
            <input id="goal-daily" className="input" type="number" min={5} max={720} value={goalForm.daily} onChange={(e) => setGoalForm((f) => ({ ...f, daily: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="goal-weekly">Weekly new problems solved</label>
            <input id="goal-weekly" className="input" type="number" min={1} max={100} value={goalForm.weekly} onChange={(e) => setGoalForm((f) => ({ ...f, weekly: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={savingGoals || data.needsMigration}>{savingGoals ? 'Saving...' : 'Save goals'}</button>
        </form>
      </div>

      <div className="dash__grid dash__grid--wide">
        <section className="card" aria-label="Recommended problems">
          <h2 className="dash-card__title">Recommended for you</h2>
          {insights.recommendations.length === 0 ? (
            <p className="text-muted">No problems left to recommend. You have solved everything available.</p>
          ) : (
            <ul className="dash-list">
              {insights.recommendations.map((r) => (
                <li key={r.problemId} className="dash-list__item">
                  <div>
                    <Link href={`/coding/${r.slug || r.problemId}`} className="table__primary">{r.title}</Link>{' '}
                    <DifficultyBadge difficulty={r.difficulty} />{' '}
                    <span className="badge badge--cat">{r.category}</span>{' '}
                    <span className="badge badge--tag">{KIND_LABEL[r.kind]}</span>
                    <p className="text-sm text-muted">{r.reason}</p>
                  </div>
                  <button
                    type="button" className="btn btn--ghost btn--sm" disabled={addingPlan || data.needsMigration}
                    onClick={() => addPlan(`Solve: ${r.title}`, r.problemId, todayStr)}
                  >
                    Add to plan
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-label="Topic strengths">
          <h2 className="dash-card__title">Topics</h2>
          {insights.weakTopics.length === 0 && insights.strongTopics.length === 0 ? (
            <p className="text-muted">Submit solutions to a few problems and your strengths and weak spots will show up here.</p>
          ) : (
            <>
              {insights.weakTopics.map((w) => <p key={w.category} className="dash-topic dash-topic--weak"><strong>{w.category}</strong> needs work. <span className="text-sm text-muted">{w.reason}</span></p>)}
              {insights.strongTopics.map((s) => <p key={s.category} className="dash-topic dash-topic--strong"><strong>{s.category}</strong> is strong. <span className="text-sm text-muted">{s.reason}</span></p>)}
            </>
          )}
          {insights.categoryStats.length > 0 && (
            <ul className="dash-cats">
              {insights.categoryStats.map((c) => (
                <li key={c.category}>
                  <span>{c.category}</span>
                  <span className="dash-cats__meter" aria-hidden="true"><span style={{ width: `${Math.round(c.coverage * 100)}%` }} /></span>
                  <span className="text-sm text-muted">{c.solved}/{c.total}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dash__grid dash__grid--wide">
        <section className="card" aria-label="Study plan">
          <h2 className="dash-card__title">Study plan</h2>
          <form className="dash-plan__form" onSubmit={(e) => { e.preventDefault(); addPlan(planTitle); }}>
            <label htmlFor="plan-title" className="sr-only">What will you do?</label>
            <input id="plan-title" className="input" placeholder="What will you do?" maxLength={120} value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
            <label htmlFor="plan-date" className="sr-only">Date</label>
            <input id="plan-date" className="input" type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
            <button type="submit" className="btn btn--primary" disabled={addingPlan || data.needsMigration}>Add</button>
          </form>
          {plan.length === 0 ? (
            <p className="text-muted">Nothing planned yet.</p>
          ) : (
            <ul className="dash-list">
              {plan.map((item) => (
                <li key={item.id} className="dash-list__item">
                  <label className={`dash-plan__item ${item.done ? 'dash-plan__item--done' : ''}`}>
                    <input type="checkbox" checked={item.done} onChange={() => togglePlan(item)} />
                    <span>
                      {item.problem_id ? <Link href={`/coding/${item.problem_id}`}>{item.title}</Link> : item.title}
                      <small className={item.due_date < todayStr && !item.done ? 'dash-overdue' : ''}>
                        {' '}· {item.due_date === todayStr ? 'today' : item.due_date}{item.due_date < todayStr && !item.done ? ' (overdue)' : ''}
                      </small>
                    </span>
                  </label>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => removePlan(item)} aria-label={`Remove ${item.title}`}>
                    <HiTrash size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <StudyAssistant />
      </div>
    </div>
  );
}
