/* eslint-disable no-console */
// Browser test of the problem page's keyboard shortcuts and judge UI wiring.
// UI TEST ONLY: Supabase REST and /api/judge/* responses are MOCKED at the network layer so no
// database or judge is needed. It proves the shortcuts, rendering and duplicate-submit guard,
// not the judge itself (see test-judge.mjs / verify-questions.mjs for that).
//
//   npm run build && npm run start -- -p 3100
//   PUPPETEER_DIR=<folder containing node_modules/puppeteer-core> node scripts/test-editor-ui.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pupDir = process.env.PUPPETEER_DIR || root;
const puppeteer = (await import(pathToFileURL(createRequire(path.join(pupDir, 'x.js')).resolve('puppeteer-core')).href)).default;
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

const PROBLEM_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const problem = {
  id: PROBLEM_ID, slug: 'ui-test', title: 'UI Test Problem', description: 'Add two numbers.', difficulty: 'Easy',
  category: 'Math', type: 'code', tags: ['math'], starter_code: { python: 'print(1)\n', javascript: 'function  f( a,b ){return a+b}\n' },
  examples: [{ input: '1 2', output: '3', explanation: '' }], constraints: ['a, b fit in 32 bits'], points: 10,
  input_format: 'Two integers', output_format: 'Their sum', editorial: '', judged: true, time_limit_ms: 2000, memory_limit_kb: 262144,
};
const verdictBody = (mode) => ({
  mode, submissionId: 's1', verdict: 'accepted', passed: 3, total: 3, runtimeMs: 12, memoryKb: 2048, compileOutput: '',
  results: [
    { index: 1, sample: true, verdict: 'accepted', runtimeMs: 10, memoryKb: 2048, input: '1 2\n', expected: '3\n', actual: '3\n', stderr: '' },
    { index: 2, sample: false, verdict: 'accepted', runtimeMs: 12, memoryKb: 2048 },
    { index: 3, sample: false, verdict: 'accepted', runtimeMs: 9, memoryKb: 2048 },
  ],
  pointsEarned: mode === 'submit' ? 10 : 0, contestRecorded: null,
});

let failed = 0;
const check = (name, cond, detail = '') => { if (!cond) failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const calls = [];
await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  const json = (body, type = 'application/json', status = 200) =>
    req.respond({ status, contentType: type, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS' && url.includes('supabase.co')) {
    return req.respond({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  }
  if (url.includes('supabase.co/rest/v1/coding_problems')) return json(problem, 'application/vnd.pgrst.object+json');
  if (url.includes('supabase.co/rest/v1/problem_tests')) return json([{ position: 1, input: '1 2\n', expected_output: '3\n' }]);
  if (url.includes('supabase.co/rest/v1/profiles')) return json({ id: USER_ID, full_name: 'Test User', role: 'user' }, 'application/vnd.pgrst.object+json');
  if (url.includes('supabase.co/rest/v1/judge_drafts')) {
    if (req.method() === 'GET') return json(null, 'application/vnd.pgrst.object+json', 200);
    calls.push({ kind: 'draft', body: req.postData() });
    return req.respond({ status: 201, headers: { 'access-control-allow-origin': '*' }, body: '' });
  }
  if (url.includes('supabase.co/rest/v1/') && req.method() === 'GET') return json(url.includes('select=id') ? null : [], 'application/vnd.pgrst.object+json');
  if (url.includes('/api/judge/config')) return json({ configured: true, languages: [] });
  if (url.includes('/api/judge/run') || url.includes('/api/judge/submit')) {
    const kind = url.endsWith('/run') ? 'run' : 'submit';
    calls.push({ kind, body: JSON.parse(req.postData()) });
    return setTimeout(() => json(verdictBody(kind)), 700);
  }
  return req.continue();
});

const session = { access_token: 'x.y.z', refresh_token: 'r', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
  user: { id: USER_ID, aud: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: { full_name: 'Test User' }, created_at: new Date().toISOString() } };
await page.setCookie({ name: `sb-${ref}-auth-token`, value: encodeURIComponent(JSON.stringify(session)), domain: 'localhost', path: '/' });

await page.goto(`${BASE}/coding/ui-test`, { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForSelector('.monaco-editor', { timeout: 60000 });
await sleep(1500);

const modelValue = () => page.evaluate(() => window.monaco.editor.getModels().slice(-1)[0]?.getValue());
const focusEditor = async () => {
  for (let i = 0; i < 5; i++) {
    await page.click('.monaco-editor .view-lines');
    await sleep(150);
    if (await page.evaluate(() => window.monaco.editor.getEditors()[0]?.hasTextFocus())) return;
  }
  throw new Error('could not focus the editor');
};
const press = async (keys) => {
  for (const k of keys.slice(0, -1)) await page.keyboard.down(k);
  await page.keyboard.press(keys.at(-1));
  for (const k of keys.slice(0, -1).reverse()) await page.keyboard.up(k);
};
const waitFor = async (fn, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(100); } return false; };
const consoleText = () => page.$eval('.judge-console', (el) => el.innerText);

check('editor and console render', !!(await page.$('.judge-console')) && (await consoleText()).includes('Sample 1'));

// Ctrl+Enter runs sample tests
await focusEditor();
await press(['Control', 'Enter']);
check('Ctrl+Enter sends a run request', await waitFor(() => calls.some((c) => c.kind === 'run')), JSON.stringify(calls.find((c) => c.kind === 'run')?.body).slice(0, 90));
check('run request carries problemId, language and code', (() => { const b = calls.find((c) => c.kind === 'run')?.body; return b?.problemId === PROBLEM_ID && b.language === 'python' && b.code.includes('print(1)') && !('contestId' in b); })());
check('run result renders verdict and per-test rows', await waitFor(async () => (await consoleText()).includes('Accepted') && (await consoleText()).includes('Hidden test 2')));
const txt = await consoleText();
check('result shows runtime and memory', /12 ms/.test(txt) && /2\.0 MB/.test(txt));

// Duplicate guard: two quick Ctrl+Enter presses -> one request
const before = calls.length;
await focusEditor();
await press(['Control', 'Enter']);
await press(['Control', 'Enter']);
await sleep(1500);
check('rapid double Ctrl+Enter sends only one request', calls.length - before === 1, `${calls.length - before} request(s)`);

// Ctrl+Shift+Enter submits
await sleep(500);
await focusEditor();
await press(['Control', 'Shift', 'Enter']);
check('Ctrl+Shift+Enter sends a submit request', await waitFor(() => calls.some((c) => c.kind === 'submit')));
check('submit result shows points', await waitFor(async () => (await consoleText()).includes('+10 pts')));

// Ctrl+S saves the draft and the browser default is prevented
await page.evaluate(() => { window.__ctrlSEvents = []; window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') window.__ctrlSEvents.push(e); }, true); });
await focusEditor();
await press(['Control', 's']);
check('Ctrl+S upserts a draft', await waitFor(() => calls.some((c) => c.kind === 'draft')), (calls.find((c) => c.kind === 'draft')?.body || '').slice(0, 80));
await sleep(150);
check('Ctrl+S default (browser save dialog) is prevented, editor focused', await page.evaluate(() => window.__ctrlSEvents.length > 0 && window.__ctrlSEvents.every((e) => e.defaultPrevented)));
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.evaluate(() => { window.__ctrlSEvents = []; });
await page.keyboard.down('Control'); await page.keyboard.press('s'); await page.keyboard.up('Control');
await sleep(300);
check('Ctrl+S default is prevented with focus outside the editor', await page.evaluate(() => window.__ctrlSEvents.length > 0 && window.__ctrlSEvents.every((e) => e.defaultPrevented)));

// Ctrl+/ toggles a comment
await focusEditor();
await press(['Control', 'a']);
await page.keyboard.type('x = 1');
await press(['Control', 'Slash']);
await sleep(400);
const commented = await modelValue();
check('Ctrl+/ comments the line', /^#\s?x\s*=\s*1/.test(commented), JSON.stringify(commented));
await press(['Control', 'Slash']);
await sleep(400);
check('Ctrl+/ again uncomments it', (await modelValue()).replace(/\s+/g, '') === 'x=1', JSON.stringify(await modelValue()));

// Shift+Alt+F formats (JavaScript has a built-in formatter)
await page.select('select[aria-label="Language"]', 'javascript');
await sleep(1500);
await focusEditor();
const messy = await modelValue();
let formatted = false;
for (let attempt = 0; attempt < 3 && !formatted; attempt++) {
  await focusEditor();
  await press(['Shift', 'Alt', 'f']);
  formatted = await waitFor(async () => (await modelValue()) !== messy, 6000);
}
check('Shift+Alt+F formats JavaScript', formatted, JSON.stringify(await modelValue()));

// "?" opens help outside the editor and does not hijack typing inside it
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.click('.problem-detail__left');
await page.keyboard.press('?');
check('"?" outside the editor opens the shortcut dialog', await waitFor(() => page.$('[role="dialog"]')));
check('dialog lists all shortcuts', await page.$eval('[role="dialog"]', (d) => ['Run', 'Submit', 'Save', 'comment', 'Format'].every((w) => d.innerText.includes(w))));
await page.keyboard.press('Escape');
check('Escape closes the dialog', await waitFor(async () => !(await page.$('[role="dialog"]'))));
await focusEditor();
await press(['Control', 'a']);
await page.keyboard.press('?');
await sleep(300);
check('typing "?" inside the editor types it and opens no dialog', (await modelValue()).includes('?') && !(await page.$('[role="dialog"]')), JSON.stringify({ value: await modelValue(), dialog: !!(await page.$('[role="dialog"]')), active: await page.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className) }));

// custom input console tab
await page.click('.judge-console__tab:nth-child(2)');
const before2 = calls.length;
await page.focus('.judge-custom__input');
await press(['Control', 'Enter']);
await sleep(300);
check('Ctrl+Enter works from the custom input box and sends customInput', calls.length - before2 === 1 && typeof calls.at(-1).body.customInput === 'string', JSON.stringify(calls.at(-1)?.body.customInput));

check('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(failed === 0 ? '\nAll editor UI checks passed.' : `\n${failed} editor UI check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
