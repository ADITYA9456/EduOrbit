'use client';

import EmptyState from '@/components/ui/EmptyState';
import Table from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiTrash } from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const phase = (c) => {
  const now = Date.now();
  if (now < new Date(c.start_time).getTime()) return 'Upcoming';
  return now > new Date(c.end_time).getTime() ? 'Ended' : 'Live';
};

export default function AdminContests({ ask }) {
  const supabase = createClient();
  const [contests, setContests] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from('contests').select('*').order('start_time', { ascending: false }),
      supabase.from('coding_problems').select('id, title, difficulty').eq('type', 'code').eq('judged', true).order('title'),
    ]);
    if (c.error) setError('Could not load contests.');
    else { setContests(c.data || []); setError(''); }
    setProblems(p.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    const start = new Date(Date.now() + 3_600_000);
    start.setMinutes(0, 0, 0);
    setErrors({});
    setEditing({ form: { title: '', description: '', start: toLocalInput(start), end: toLocalInput(new Date(start.getTime() + 2 * 3_600_000)), picked: {} }, locked: false });
  };

  const openEdit = async (c) => {
    const { data } = await supabase.from('contest_problems').select('problem_id, points').eq('contest_id', c.id);
    const picked = Object.fromEntries((data || []).map((r) => [r.problem_id, String(r.points)]));
    setErrors({});
    setEditing({
      id: c.id,
      locked: Date.now() >= new Date(c.start_time).getTime(),
      form: { title: c.title, description: c.description || '', start: toLocalInput(c.start_time), end: toLocalInput(c.end_time), picked },
    });
  };

  const setForm = (patch) => setEditing((e) => ({ ...e, form: { ...e.form, ...patch } }));

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const f = editing.form;
    const found = {};
    if (!f.title.trim() || f.title.length > 120) found.title = 'Title is required (up to 120 characters)';
    const start = new Date(f.start);
    const end = new Date(f.end);
    if (Number.isNaN(start.getTime())) found.start = 'Pick a start time';
    if (Number.isNaN(end.getTime())) found.end = 'Pick an end time';
    else if (end <= start) found.end = 'The end must be after the start';
    const chosen = Object.entries(f.picked);
    if (!editing.locked) {
      if (chosen.length === 0) found.problems = 'Choose at least one problem';
      else if (chosen.some(([, pts]) => !Number.isInteger(Number(pts)) || Number(pts) < 1 || Number(pts) > 10000)) found.problems = 'Points must be whole numbers from 1 to 10000';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const row = { title: f.title.trim(), description: f.description.trim(), start_time: start.toISOString(), end_time: end.toISOString() };
      let id = editing.id;
      if (id) {
        const { error: err } = await supabase.from('contests').update(row).eq('id', id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.from('contests').insert(row).select('id').single();
        if (err) throw err;
        id = data.id;
      }
      if (!editing.locked) {
        const { error: delErr } = await supabase.from('contest_problems').delete().eq('contest_id', id);
        if (delErr) throw delErr;
        const { error: insErr } = await supabase
          .from('contest_problems')
          .insert(chosen.map(([problem_id, pts], i) => ({ contest_id: id, problem_id, points: Number(pts), order_index: i })));
        if (insErr) throw insErr;
      }
      toast.success(editing.id ? 'Contest updated' : 'Contest created');
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error('Could not save the contest. Check you are signed in as an admin and migration 004 is applied.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c) =>
    ask({
      title: `Delete "${c.title}"?`,
      message: 'Registrations, submissions and standings for this contest are deleted with it. This cannot be undone.',
      confirmLabel: 'Delete contest',
      danger: true,
      run: async () => {
        const { error: err } = await supabase.from('contests').delete().eq('id', c.id);
        if (err) return toast.error('Could not delete the contest');
        toast.success('Contest deleted');
        load();
      },
    });

  if (editing) {
    const f = editing.form;
    return (
      <form className="card" style={{ padding: 20, display: 'grid', gap: 14 }} onSubmit={save} noValidate>
        <h2 style={{ margin: 0 }}>{editing.id ? 'Edit contest' : 'New contest'}</h2>
        <div className="form-group"><label htmlFor="c-title">Title</label>
          <input id="c-title" className="input" value={f.title} maxLength={120} onChange={(e) => setForm({ title: e.target.value })} />
          {errors.title && <p className="field-msg field-msg--error">{errors.title}</p>}</div>
        <div className="form-group"><label htmlFor="c-desc">Description</label>
          <textarea id="c-desc" className="input" rows={3} value={f.description} onChange={(e) => setForm({ description: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="form-group"><label htmlFor="c-start">Starts</label>
            <input id="c-start" className="input" type="datetime-local" value={f.start} onChange={(e) => setForm({ start: e.target.value })} />
            {errors.start && <p className="field-msg field-msg--error">{errors.start}</p>}</div>
          <div className="form-group"><label htmlFor="c-end">Ends</label>
            <input id="c-end" className="input" type="datetime-local" value={f.end} onChange={(e) => setForm({ end: e.target.value })} />
            {errors.end && <p className="field-msg field-msg--error">{errors.end}</p>}</div>
        </div>
        <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 }}>
          <legend>Problems</legend>
          {editing.locked && <p className="text-sm text-muted">The contest has started, so its problems are locked to keep scoring fair.</p>}
          {problems.length === 0 && <p className="text-sm text-muted">No judged problems exist yet.</p>}
          <div style={{ display: 'grid', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {problems.map((p) => {
              const on = p.id in f.picked;
              return (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label style={{ flex: 1 }}>
                    <input type="checkbox" checked={on} disabled={editing.locked}
                      onChange={(e) => {
                        const next = { ...f.picked };
                        if (e.target.checked) next[p.id] = '100'; else delete next[p.id];
                        setForm({ picked: next });
                      }} /> {p.title} <span className="text-sm text-muted">({p.difficulty})</span>
                  </label>
                  {on && (
                    <>
                      <label htmlFor={`pts-${p.id}`} className="sr-only">Points for {p.title}</label>
                      <input id={`pts-${p.id}`} className="input" style={{ width: 90 }} type="number" min={1} max={10000} value={f.picked[p.id]} disabled={editing.locked}
                        onChange={(e) => setForm({ picked: { ...f.picked, [p.id]: e.target.value } })} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {errors.problems && <p className="field-msg field-msg--error">{errors.problems}</p>}
        </fieldset>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving...' : editing.id ? 'Save changes' : 'Create contest'}</button>
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div><button type="button" className="btn btn--primary btn--sm" onClick={openNew}><HiPlus size={14} aria-hidden="true" /> New contest</button></div>
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : error ? (
        <EmptyState title="Could not load contests" message={error} action={<button type="button" className="btn btn--primary" onClick={load}>Try again</button>} />
      ) : contests.length === 0 ? (
        <EmptyState icon={<HiTrophy size={48} />} title="No contests" message="Create the first contest." />
      ) : (
        <Table caption="Contests" columns={[{ key: 't', label: 'Title' }, { key: 's', label: 'Starts' }, { key: 'e', label: 'Ends' }, { key: 'st', label: 'Status' }, { key: 'a', label: 'Actions' }]}>
          {contests.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="table__primary">{c.title}</th>
              <td>{new Date(c.start_time).toLocaleString()}</td>
              <td>{new Date(c.end_time).toLocaleString()}</td>
              <td>{phase(c)}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(c)}>Edit</button>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(c)} aria-label={`Delete ${c.title}`}><HiTrash size={14} aria-hidden="true" /></button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
