'use client';

import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthProvider';
import { useRef, useState } from 'react';

const EMPTY = { name: '', email: '', subject: '', message: '', website: '' };

export default function ContactPage() {
  const { profile, user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const refs = { name: useRef(null), email: useRef(null), subject: useRef(null), message: useRef(null) };

  const value = (key) => form[key] || (key === 'name' ? profile?.full_name || '' : key === 'email' ? user?.email || '' : '');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setFormError('');
    const payload = {
      name: value('name').trim(),
      email: value('email').trim(),
      subject: value('subject').trim(),
      message: value('message').trim(),
      website: form.website,
    };
    const found = {};
    if (!payload.name) found.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) found.email = 'Enter a valid email address';
    if (!payload.subject) found.subject = 'Enter a subject';
    if (payload.message.length < 10) found.message = 'Write at least 10 characters';
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return refs[first].current?.focus();

    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error || 'Could not send your message. Please try again.');
      }
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  const field = (key, label, props = {}) => (
    <div className="form-group">
      <label htmlFor={`contact-${key}`}>{label}</label>
      {key === 'message' ? (
        <textarea
          id={`contact-${key}`} ref={refs[key]} className="input" rows={7} maxLength={4000}
          value={value(key)} onChange={set(key)} aria-invalid={errors[key] ? 'true' : undefined}
          aria-describedby={errors[key] ? `contact-${key}-error` : undefined} {...props}
        />
      ) : (
        <input
          id={`contact-${key}`} ref={refs[key]} className="input" maxLength={key === 'subject' ? 150 : 200}
          value={value(key)} onChange={set(key)} aria-invalid={errors[key] ? 'true' : undefined}
          aria-describedby={errors[key] ? `contact-${key}-error` : undefined} {...props}
        />
      )}
      {errors[key] && <p id={`contact-${key}-error`} className="field-msg field-msg--error">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Contact" description="Questions, bug reports, account or data requests. We read every message." />
      <div className="card" style={{ maxWidth: 640, padding: 'var(--space-lg, 24px)' }}>
        {sent ? (
          <div className="form-success" role="status">
            Thanks. Your message has been sent and we will reply to the email you gave.
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSent(false)}>Send another message</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="auth-form">
            {formError && <div className="form-error" role="alert">{formError}</div>}
            {field('name', 'Your name', { autoComplete: 'name' })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {field('subject', 'Subject')}
            {field('message', 'Message')}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
              <label htmlFor="contact-website">Website</label>
              <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>
            <button type="submit" className="btn btn--primary btn--lg" disabled={sending}>
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
