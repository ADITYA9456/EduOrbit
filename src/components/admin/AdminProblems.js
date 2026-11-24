'use client';

import EmptyState from '@/components/ui/EmptyState';
import Table from '@/components/ui/Table';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCode, HiPlus, HiTrash } from 'react-icons/hi';

const BLANK = {
  title: '', description: '', difficulty: 'Easy', category: '', tags: '', points: '10',
  input_format: '', output_format: '', constraints: '', editorial: '', time_limit_ms: '2000', memory_limit_kb: '262144',
  tests: [{ input: '', expected_output: '', is_sample: true }],
};

async function api(url, options) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { fields: data.fields });
  return data;
}

export default function AdminProblems({ ask }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | { id?: string, form }
  const [fields, setFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/problems');
      setProblems(data.problems);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setFields({}); setEditing({ form: { ...BLANK, tests: [...BLANK.tests] } }); };

  const openEdit = async (id) => {
    try {
      const { problem, tests } = await api(`/api/admin/problems/${id}`);
      setFields({});
      setEditing({
        id,
        form: {
          title: problem.title, description: problem.description, difficulty: problem.difficulty, category: problem.category,
          tags: (problem.tags || []).join(', '), points: String(problem.points), input_format: problem.input_format || '',
          output_format: problem.output_format || '', constraints: (problem.constraints || []).join('\n'), editorial: problem.editorial || '',
          time_limit_ms: String(problem.time_limit_ms || 2000), memory_limit_kb: String(problem.memory_limit_kb || 262144),
          tests: tests.length ? tests.map((t) => ({ input: t.input, expected_output: t.expected_output, is_sample: t.is_sample })) : BLANK.tests,
        },
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setForm = (patch) => setEditing((e) => ({ ...e, form: { ...e.form, ...patch } }));
  const setTest = (i, patch) => setForm({ tests: editing.form.tests.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFields({});
    const f = editing.form;
    const body = {
      ...f,
      points: Number(f.points), time_limit_ms: Number(f.time_limit_ms), memory_limit_kb: Number(f.memory_limit_kb),
      tags: f.tags, constraints: f.constraints,
    };
    try {
      await api(editing.id ? `/api/admin/problems/${editing.id}` : '/api/admin/problems', { method: editing.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      toast.success(editing.id ? 'Problem updated' : 'Problem created');
      setEditing(null);
      load();
    } catch (err) {
      setFields(err.fields || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (p) =>
    ask({
      title: `Delete "${p.title}"?`,
      message: 'This also deletes its test cases, drafts and every submission made to it. This cannot be undone.',
      confirmLabel: 'Delete problem',
      danger: true,
      run: async () => {
        try {
          await api(`/api/admin/problems/${p.id}`, { method: 'DELETE' });
          toast.success('Problem deleted');
          load();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });

  const err = (k) => fields[k] && <p className="field-msg field-msg--error">{fields[k]}</p>;

  if (editing) {
    const f = editing.form;
    return (
      <form className="card" style={{ padding: 20, display: 'grid', gap: 14 }} onSubmit={save} noValidate>
        <h2 style={{ margin: 0 }}>{editing.id ? 'Edit problem' : 'New problem'}</h2>
        <div className="form-group"><label htmlFor="p-title">Title</label>
          <input id="p-title" className="input" value={f.title} maxLength={120} onChange={(e) => setForm({ title: e.target.value })} />{err('title')}{err('slug')}</div>
        <div className="form-group"><label htmlFor="p-desc">Statement</label>
          <textarea id="p-desc" className="input" rows={8} value={f.description} onChange={(e) => setForm({ description: e.target.value })} />{err('description')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="form-group"><label htmlFor="p-diff">Difficulty</label>
            <select id="p-diff" className="input" value={f.difficulty} onChange={(e) => setForm({ difficulty: e.target.value })}>
              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
            </select>{err('difficulty')}</div>
          <div className="form-group"><label htmlFor="p-cat">Category</label>
            <input id="p-cat" className="input" value={f.category} maxLength={60} onChange={(e) => setForm({ category: e.target.value })} />{err('category')}</div>
          <div className="form-group"><label htmlFor="p-points">Points</label>
            <input id="p-points" className="input" type="number" value={f.points} onChange={(e) => setForm({ points: e.target.value })} />{err('points')}</div>
          <div className="form-group"><label htmlFor="p-time">Time limit (ms)</label>
            <input id="p-time" className="input" type="number" value={f.time_limit_ms} onChange={(e) => setForm({ time_limit_ms: e.target.value })} />{err('time_limit_ms')}</div>
          <div className="form-group"><label htmlFor="p-mem">Memory (KB)</label>
            <input id="p-mem" className="input" type="number" value={f.memory_limit_kb} onChange={(e) => setForm({ memory_limit_kb: e.target.value })} />{err('memory_limit_kb')}</div>
        </div>
        <div className="form-group"><label htmlFor="p-tags">Tags (comma separated)</label>
          <input id="p-tags" className="input" value={f.tags} onChange={(e) => setForm({ tags: e.target.value })} />{err('tags')}</div>
        <div className="form-group"><label htmlFor="p-in">Input format</label>
          <textarea id="p-in" className="input" rows={2} value={f.input_format} onChange={(e) => setForm({ input_format: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="p-out">Output format</label>
          <textarea id="p-out" className="input" rows={2} value={f.output_format} onChange={(e) => setForm({ output_format: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="p-con">Constraints (one per line)</label>
          <textarea id="p-con" className="input" rows={3} value={f.constraints} onChange={(e) => setForm({ constraints: e.target.value })} />{err('constraints')}</div>
        <div className="form-group"><label htmlFor="p-ed">Editorial (optional)</label>
          <textarea id="p-ed" className="input" rows={5} value={f.editorial} onChange={(e) => setForm({ editorial: e.target.value })} /></div>

        <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, display: 'grid', gap: 12 }}>
          <legend>Test cases</legend>
          <p className="text-sm text-muted" style={{ margin: 0 }}>Sample tests are shown to learners. Hidden tests decide the verdict. The expected output must come from a verified reference solution.</p>
          {f.tests.map((t, i) => (
            <div key={i} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="form-group"><label htmlFor={`t-in-${i}`}>Input #{i + 1}</label>
                <textarea id={`t-in-${i}`} className="input" rows={3} style={{ fontFamily: 'monospace' }} value={t.input} onChange={(e) => setTest(i, { input: e.target.value })} /></div>
              <div className="form-group"><label htmlFor={`t-out-${i}`}>Expected output #{i + 1}</label>
                <textarea id={`t-out-${i}`} className="input" rows={3} style={{ fontFamily: 'monospace' }} value={t.expected_output} onChange={(e) => setTest(i, { expected_output: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label><input type="checkbox" checked={t.is_sample} onChange={(e) => setTest(i, { is_sample: e.target.checked })} /> Sample</label>
                <button type="button" className="btn btn--ghost btn--sm" disabled={f.tests.length === 1}
                  onClick={() => setForm({ tests: f.tests.filter((_, j) => j !== i) })} aria-label={`Remove test ${i + 1}`}><HiTrash size={14} aria-hidden="true" /></button>
              </div>
            </div>
          ))}
          {err('tests')}
          <div><button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm({ tests: [...f.tests, { input: '', expected_output: '', is_sample: false }] })}><HiPlus size={14} aria-hidden="true" /> Add test</button></div>
        </fieldset>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving...' : editing.id ? 'Save changes' : 'Create problem'}</button>
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
        </div>
      </form>
    );
  }

  const shown = problems.filter((p) => !search.trim() || p.title.toLowerCase().includes(search.trim().toLowerCase()) || p.category.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <input className="input" style={{ maxWidth: 320 }} type="search" aria-label="Search problems" placeholder="Search by title or category" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="btn btn--primary btn--sm" onClick={openNew}><HiPlus size={14} aria-hidden="true" /> New problem</button>
      </div>
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : error ? (
        <EmptyState title="Could not load problems" message={error} action={<button type="button" className="btn btn--primary" onClick={load}>Try again</button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<HiCode size={48} />} title="No problems" message="Nothing matches. Create the first problem." />
      ) : (
        <Table caption="Problems" columns={[{ key: 't', label: 'Title' }, { key: 'c', label: 'Category' }, { key: 'd', label: 'Difficulty' }, { key: 'tests', label: 'Tests' }, { key: 'a', label: 'Actions' }]}>
          {shown.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="table__primary"><Link href={`/coding/${p.slug || p.id}`}>{p.title}</Link></th>
              <td>{p.category}</td>
              <td>{p.difficulty}</td>
              <td>{p.tests.samples} sample, {p.tests.hidden} hidden{!p.judged && <span className="badge badge--hard table__tag">Not judged</span>}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(p.id)}>Edit</button>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(p)} aria-label={`Delete ${p.title}`}><HiTrash size={14} aria-hidden="true" /></button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
