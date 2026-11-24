'use client';

import { useEffect, useRef, useState } from 'react';
import { HiPaperAirplane } from 'react-icons/hi';

const SUGGESTIONS = ['What should I practise next?', 'Why am I struggling with my weak topics?', 'Give me a study plan for this week'];

export default function StudyAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages, sending]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setError('');
    setInput('');
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setSending(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The assistant could not answer.');
      setMessages((m) => [...m, { role: 'model', text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card dash-chat" aria-label="Study assistant">
      <h2 className="dash-card__title">Study assistant</h2>
      <p className="text-sm text-muted">Answers use your real progress. It can be wrong, so double-check important details.</p>
      <div className="dash-chat__log" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="dash-chat__suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="btn btn--ghost btn--sm" onClick={() => send(s)} disabled={sending}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`dash-chat__msg dash-chat__msg--${m.role}`}>
            <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Assistant: '}</span>
            {m.text}
          </div>
        ))}
        {sending && <div className="dash-chat__msg dash-chat__msg--model" role="status">Thinking...</div>}
        <div ref={endRef} />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="dash-chat__form" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="assistant-input" className="sr-only">Ask the study assistant</label>
        <input
          id="assistant-input" className="input" placeholder="Ask about your progress or a topic..."
          maxLength={1000} value={input} onChange={(e) => setInput(e.target.value)} disabled={sending}
        />
        <button type="submit" className="btn btn--primary" disabled={sending || !input.trim()} aria-label="Send">
          <HiPaperAirplane size={16} aria-hidden="true" style={{ transform: 'rotate(90deg)' }} />
        </button>
      </form>
    </section>
  );
}
