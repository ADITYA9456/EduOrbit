// Server-side judge configuration. Never import this from a client component:
// it reads secrets from the environment.

// Judge0 CE language ids (v1.13.1). Override any of them with JUDGE0_LANG_<KEY>,
// e.g. JUDGE0_LANG_PYTHON=71, when your Judge0 build ships different runtimes.
const DEFAULT_IDS = { javascript: 93, python: 92, java: 91, cpp: 54, c: 50 };

export const LANGUAGES = {
  javascript: { name: 'JavaScript', monaco: 'javascript', cpuFactor: 2 },
  python: { name: 'Python', monaco: 'python', cpuFactor: 3 },
  java: { name: 'Java', monaco: 'java', cpuFactor: 2 },
  cpp: { name: 'C++', monaco: 'cpp', cpuFactor: 1 },
  c: { name: 'C', monaco: 'c', cpuFactor: 1 },
};

export const LIMITS = {
  maxCodeBytes: 64 * 1024,
  maxStdinBytes: 64 * 1024,
  maxTests: 40,
  maxOutputChars: 2000,
  // Whole request budget; the route's maxDuration is higher so we can answer cleanly.
  deadlineMs: 40_000,
  requestTimeoutMs: 10_000,
  pollIntervalMs: 700,
  maxCpuSeconds: Number(process.env.JUDGE0_MAX_CPU_SECONDS) || 15,
  submitsPerMinute: Number(process.env.JUDGE_SUBMITS_PER_MINUTE) || 8,
  requestsPerMinute: Number(process.env.JUDGE_REQUESTS_PER_MINUTE) || 20,
};

export function languageId(key) {
  const override = Number(process.env[`JUDGE0_LANG_${key.toUpperCase()}`]);
  return Number.isInteger(override) && override > 0 ? override : DEFAULT_IDS[key];
}

export function getJudgeConfig() {
  const url = (process.env.JUDGE0_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (process.env.JUDGE0_API_KEY || '').trim();
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    // Self-hosted Judge0 uses X-Auth-Token. RapidAPI uses X-RapidAPI-Key (+ host).
    headers[process.env.JUDGE0_AUTH_HEADER || 'X-Auth-Token'] = apiKey;
  }
  if (process.env.JUDGE0_RAPIDAPI_HOST) headers['X-RapidAPI-Host'] = process.env.JUDGE0_RAPIDAPI_HOST;
  return { configured: /^https?:\/\//.test(url), url, headers };
}

export function publicLanguages() {
  return Object.entries(LANGUAGES).map(([id, l]) => ({ id, name: l.name }));
}
