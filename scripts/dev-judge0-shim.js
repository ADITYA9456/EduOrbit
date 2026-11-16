/* eslint-disable no-console */
// DEV / TEST ONLY. Not Judge0 and NOT a sandbox.
// Implements the small part of the Judge0 CE batch API that the app uses and runs submitted
// code with the toolchains installed on THIS machine (node, python, javac/java, gcc/g++).
// It exists so the judge integration can be exercised end to end when Docker is unavailable.
// Binds to 127.0.0.1 only. Never expose it, never use it in production.
//
//   node scripts/dev-judge0-shim.js            (listens on 127.0.0.1:2358)
//   JUDGE0_URL=http://127.0.0.1:2358 npm run dev
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 2358;
const jobs = new Map();

// Language ids match the app defaults in src/lib/judge/config.js.
const LANGS = {
  93: { file: 'main.js', run: ['node', ['main.js']] },
  92: { file: 'main.py', run: [process.platform === 'win32' ? 'python' : 'python3', ['main.py']] },
  91: { file: 'Main.java', compile: ['javac', ['Main.java']], run: ['java', ['-Xss64m', 'Main']] },
  54: { file: 'main.cpp', compile: ['g++', ['-O2', '-std=c++14', '-o', 'main', 'main.cpp']], run: [path.resolve('main'), []] },
  50: { file: 'main.c', compile: ['gcc', ['-O2', '-o', 'main', 'main.c', '-lm']], run: [path.resolve('main'), []] },
};

function exec(cmd, args, { cwd, stdin = '', timeoutMs }) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => { if (stdout.length < 4_000_000) stdout += d; });
    child.stderr.on('data', (d) => { if (stderr.length < 100_000) stderr += d; });
    child.on('error', (e) => { stderr += String(e.message); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, ms: Number(process.hrtime.bigint() - started) / 1e6 });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

async function runJob(sub) {
  const lang = LANGS[sub.language_id];
  if (!lang) return { status: { id: 13, description: 'Internal Error' }, message: 'unknown language' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shim-'));
  try {
    fs.writeFileSync(path.join(dir, lang.file), Buffer.from(sub.source_code, 'base64'));
    if (lang.compile) {
      const c = await exec(lang.compile[0], lang.compile[1], { cwd: dir, timeoutMs: 30000 });
      if (c.code !== 0) {
        return { status: { id: 6, description: 'Compilation Error' }, compile_output: c.stdout + c.stderr };
      }
    }
    const cmd = lang.run[0] === path.resolve('main') ? path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main') : lang.run[0];
    const wallMs = Math.max(500, (Number(sub.wall_time_limit) || 5) * 1000);
    const r = await exec(cmd, lang.run[1], {
      cwd: dir,
      stdin: Buffer.from(sub.stdin || '', 'base64').toString('utf8'),
      timeoutMs: Math.min(wallMs, 20000),
    });
    const base = { stdout: r.stdout, stderr: r.stderr, time: (r.ms / 1000).toFixed(3), memory: null };
    if (r.timedOut) return { ...base, status: { id: 5, description: 'Time Limit Exceeded' } };
    if (r.code !== 0) return { ...base, status: { id: 11, description: 'Runtime Error (NZEC)' } };
    return { ...base, status: { id: 3, description: 'Accepted' } };
  } catch (e) {
    return { status: { id: 13, description: 'Internal Error' }, message: e.message };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const b64 = (s) => (s == null ? null : Buffer.from(String(s), 'utf8').toString('base64'));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname !== '/submissions/batch') return send(404, { error: 'not found' });

  if (req.method === 'POST') {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw); } catch { return send(400, { error: 'bad json' }); }
      const tokens = (body.submissions || []).map((sub) => {
        const token = crypto.randomUUID();
        jobs.set(token, { status: { id: 2, description: 'Processing' } });
        runJob(sub).then((r) => jobs.set(token, r));
        return { token };
      });
      send(201, tokens);
    });
    return undefined;
  }

  const tokens = (url.searchParams.get('tokens') || '').split(',');
  return send(200, {
    submissions: tokens.map((token) => {
      const j = jobs.get(token) || { status: { id: 13, description: 'Internal Error' } };
      return {
        token,
        status: j.status,
        stdout: b64(j.stdout),
        stderr: b64(j.stderr),
        compile_output: b64(j.compile_output),
        message: b64(j.message),
        time: j.time ?? null,
        memory: j.memory ?? null,
      };
    }),
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`DEV judge shim (unsandboxed) on http://127.0.0.1:${PORT}`));
