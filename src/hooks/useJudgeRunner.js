'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const REQUEST_TIMEOUT_MS = 58_000;

/**
 * Talks to /api/judge/*. One request at a time: a second call while one is in flight is ignored,
 * so double clicks and repeated shortcuts cannot create duplicate submissions.
 */
export function useJudgeRunner({ problemId, contestId = null }) {
  const [config, setConfig] = useState({ loading: true, configured: false });
  const [busy, setBusy] = useState(null); // null | 'run' | 'submit'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const busyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/judge/config')
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((data) => { if (!cancelled) setConfig({ loading: false, configured: !!data.configured }); })
      .catch(() => { if (!cancelled) setConfig({ loading: false, configured: false }); });
    return () => { cancelled = true; };
  }, []);

  const call = useCallback(async (kind, payload) => {
    if (busyRef.current) return null;
    busyRef.current = kind;
    setBusy(kind);
    setError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/judge/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, ...payload }),
        signal: controller.signal,
      });
      let data = {};
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (!res.ok) {
        setResult(null);
        setError({ code: data.error || 'error', message: data.message || `Request failed (${res.status})`, status: res.status });
        return null;
      }
      setResult(data);
      return data;
    } catch (err) {
      setResult(null);
      setError({
        code: 'network',
        message: err.name === 'AbortError' ? 'The request timed out. Try again.' : 'Could not reach the server. Check your connection.',
      });
      return null;
    } finally {
      clearTimeout(timer);
      busyRef.current = null;
      setBusy(null);
    }
  }, [problemId]);

  const run = useCallback(
    (language, code, customInput) => call('run', { language, code, ...(typeof customInput === 'string' ? { customInput } : {}) }),
    [call]
  );
  const submit = useCallback(
    (language, code) => call('submit', { language, code, ...(contestId ? { contestId } : {}) }),
    [call, contestId]
  );
  const clear = useCallback(() => { setResult(null); setError(null); }, []);

  return { config, busy, result, error, run, submit, clear };
}
