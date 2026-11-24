'use client';

import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiMail } from 'react-icons/hi';

const STATUSES = ['new', 'read', 'resolved'];

export default function AdminMessages() {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error: err } = await q;
    if (err) setError(/does not exist|schema cache/i.test(err.message) ? 'The messages table is missing. Apply migration 004 first.' : 'Could not load messages.');
    else { setMessages(data || []); setError(''); }
    setLoading(false);
  }, [supabase, filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    const { error: err } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (err) return toast.error('Could not update the message');
    setMessages((m) => (filter === 'all' ? m.map((x) => (x.id === id ? { ...x, status } : x)) : m.filter((x) => x.id !== id)));
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['new', 'read', 'resolved', 'all'].map((s) => (
          <button key={s} type="button" className={`btn btn--sm ${filter === s ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setFilter(s)} aria-pressed={filter === s}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : error ? (
        <EmptyState title="Messages unavailable" message={error} />
      ) : messages.length === 0 ? (
        <EmptyState icon={<HiMail size={48} />} title="No messages" message={`No ${filter === 'all' ? '' : filter} messages.`} />
      ) : (
        messages.map((m) => (
          <article key={m.id} className="card" style={{ padding: 16 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong>{m.subject}</strong>
              <span className="text-sm text-muted">{new Date(m.created_at).toLocaleString()}</span>
            </header>
            <p className="text-sm text-muted" style={{ margin: '4px 0' }}>
              {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a> · {m.status}{m.user_id ? ' · signed in' : ''}
            </p>
            <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{m.message}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUSES.filter((s) => s !== m.status).map((s) => (
                <button key={s} type="button" className="btn btn--ghost btn--sm" onClick={() => setStatus(m.id, s)}>Mark {s}</button>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
