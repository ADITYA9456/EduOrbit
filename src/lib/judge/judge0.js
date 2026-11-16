// Thin Judge0 CE client. Server only. Every call has a timeout, and failures surface as
// JudgeError so routes can answer with a clean status instead of crashing.
import { LIMITS, getJudgeConfig } from './config';

export class JudgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'not_configured' | 'unavailable' | 'timeout'
  }
}

const b64 = (s) => Buffer.from(String(s ?? ''), 'utf8').toString('base64');
const unb64 = (s) => (s == null ? '' : Buffer.from(s, 'base64').toString('utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, init, signalDeadline) {
  const cfg = getJudgeConfig();
  if (!cfg.configured) throw new JudgeError('not_configured', 'Judge endpoint is not configured');

  const remaining = signalDeadline - Date.now();
  if (remaining <= 0) throw new JudgeError('timeout', 'Judge deadline exceeded');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(LIMITS.requestTimeoutMs, remaining));
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      ...init,
      headers: { ...cfg.headers, ...(init?.headers || {}) },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new JudgeError('unavailable', `Judge responded ${res.status}: ${text.slice(0, 200)}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof JudgeError) throw err;
    if (err.name === 'AbortError') throw new JudgeError('timeout', 'Judge request timed out');
    throw new JudgeError('unavailable', `Judge unreachable: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes `jobs` in one batch and resolves when all have finished.
 * job: { languageId, source, stdin, cpuSeconds, memoryKb }
 * returns: [{ status:{id,description}, stdout, stderr, compile_output, message, time(ms), memory(kb) }]
 */
export async function executeBatch(jobs, deadline = Date.now() + LIMITS.deadlineMs) {
  const payload = {
    submissions: jobs.map((j) => ({
      language_id: j.languageId,
      source_code: b64(j.source),
      stdin: b64(j.stdin),
      cpu_time_limit: j.cpuSeconds,
      wall_time_limit: Math.min(j.cpuSeconds * 2 + 1, 20),
      memory_limit: j.memoryKb,
      enable_network: false,
    })),
  };

  const created = await call(
    '/submissions/batch?base64_encoded=true',
    { method: 'POST', body: JSON.stringify(payload) },
    deadline
  );
  if (!Array.isArray(created) || created.length !== jobs.length || created.some((c) => !c.token)) {
    throw new JudgeError('unavailable', 'Judge returned an unexpected batch response');
  }
  const tokens = created.map((c) => c.token);

  const fields = 'token,status,stdout,stderr,compile_output,message,time,memory';
  for (;;) {
    const data = await call(
      `/submissions/batch?base64_encoded=true&fields=${fields}&tokens=${tokens.join(',')}`,
      { method: 'GET' },
      deadline
    );
    const list = data?.submissions;
    if (!Array.isArray(list)) throw new JudgeError('unavailable', 'Judge returned an unexpected status response');

    const byToken = new Map(list.map((s) => [s.token, s]));
    const ordered = tokens.map((t) => byToken.get(t));
    if (ordered.every((s) => s && s.status && s.status.id > 2)) {
      return ordered.map((s) => ({
        status: s.status,
        stdout: unb64(s.stdout),
        stderr: unb64(s.stderr),
        compile_output: unb64(s.compile_output),
        message: unb64(s.message),
        time: s.time == null ? null : Math.round(Number(s.time) * 1000),
        memory: s.memory == null ? null : Number(s.memory),
      }));
    }
    if (Date.now() + LIMITS.pollIntervalMs >= deadline) {
      throw new JudgeError('timeout', 'Judge did not finish in time');
    }
    await sleep(LIMITS.pollIntervalMs);
  }
}
