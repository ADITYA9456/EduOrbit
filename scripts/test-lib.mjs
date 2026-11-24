/* eslint-disable no-console */
// Unit checks for pure server/client helpers. No network, no database.
//   node scripts/test-lib.mjs
import assert from 'node:assert/strict';
import { buildInsights, dailyTotals, safeTimeZone } from '../src/lib/learning.js';
import { parseProblemInput, slugify } from '../src/lib/problem-input.js';
import { safeRedirectPath } from '../src/lib/safe-redirect.js';
import { cacheGet, cacheSet, rateLimit } from '../src/lib/memory-cache.js';

let failed = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${e.message.split('\n')[0]}`);
  }
};

// ---- safeRedirectPath
test('redirect: keeps ordinary in-app paths', () => {
  assert.equal(safeRedirectPath('/coding/two-sum'), '/coding/two-sum');
  assert.equal(safeRedirectPath('/coding?x=1#y'), '/coding?x=1#y');
});
test('redirect: blocks open redirects', () => {
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '/\r\nSet-Cookie: x=1', '', null, undefined, 42]) {
    assert.equal(safeRedirectPath(bad), '/home', String(bad));
  }
});
test('redirect: never bounces back to auth pages or the API', () => {
  assert.equal(safeRedirectPath('/login'), '/home');
  assert.equal(safeRedirectPath('/signup?x=1'), '/home');
  assert.equal(safeRedirectPath('/api/auth/signout'), '/home');
});

// ---- rate limit and cache
test('rateLimit: allows `limit` calls, then blocks with retryAfter', () => {
  const key = `t-${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000).ok, true);
  const blocked = rateLimit(key, 3, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1 && blocked.retryAfter <= 60);
});
test('cache: stores and expires entries', () => {
  cacheSet('k1', { a: 1 }, 60_000);
  assert.deepEqual(cacheGet('k1'), { a: 1 });
  cacheSet('k2', 'x', -1);
  assert.equal(cacheGet('k2'), undefined);
});

// ---- problem input validation
const good = () => ({
  title: 'Sum Two Numbers', description: 'Add a and b.', difficulty: 'Easy', category: 'Math', points: 10,
  tags: 'math, basics', constraints: '1 <= a <= 10\n1 <= b <= 10', input_format: 'a b', output_format: 'sum',
  tests: [{ input: '1 2\n', expected_output: '3\n', is_sample: true }, { input: '5 5\n', expected_output: '10\n', is_sample: false }],
});
test('problem input: a valid problem parses, slugs and derives examples', () => {
  const r = parseProblemInput(good());
  assert.equal(r.errors, undefined);
  assert.equal(r.problem.slug, 'sum-two-numbers');
  assert.deepEqual(r.problem.tags, ['math', 'basics']);
  assert.equal(r.problem.constraints.length, 2);
  assert.equal(r.problem.examples.length, 1);
  assert.equal(r.problem.examples[0].output, '3');
  assert.equal(r.problem.type, 'code');
});
test('problem input: rejects bad fields with per-field messages', () => {
  const r = parseProblemInput({ ...good(), title: '', difficulty: 'Brutal', points: 0, time_limit_ms: 10 });
  for (const k of ['title', 'difficulty', 'points', 'time_limit_ms']) assert.ok(r.errors[k], k);
});
test('problem input: needs a sample test and non-empty expected outputs', () => {
  assert.ok(parseProblemInput({ ...good(), tests: [] }).errors.tests);
  assert.ok(parseProblemInput({ ...good(), tests: [{ input: '1', expected_output: '1', is_sample: false }] }).errors.tests);
  assert.ok(parseProblemInput({ ...good(), tests: [{ input: '1', expected_output: '  ', is_sample: true }] }).errors.tests);
});
test('problem input: ignores unknown starter languages, normalises CRLF', () => {
  const r = parseProblemInput({ ...good(), starter_code: { python: 'x=1', cobol: 'nope' }, tests: [{ input: '1\r\n', expected_output: '2\r\n', is_sample: true }] });
  assert.deepEqual(Object.keys(r.problem.starter_code), ['python']);
  assert.equal(r.tests[0].input, '1\n');
});
test('slugify: plain, accented and punctuation-heavy titles', () => {
  assert.equal(slugify('Two Sum (Easy!)'), 'two-sum-easy');
  assert.equal(slugify('  Café  Graph '), 'cafe-graph');
  assert.equal(slugify('!!!'), '');
});

// ---- learning insights
const P = (id, category, difficulty) => ({ id, title: `P${id}`, slug: `p${id}`, category, difficulty, points: 10, tags: [] });
const problems = [P(1, 'Graphs', 'Easy'), P(2, 'Graphs', 'Medium'), P(3, 'Graphs', 'Hard'), P(4, 'Arrays', 'Easy'), P(5, 'Arrays', 'Easy'), P(6, 'Arrays', 'Medium'), P(7, 'Math', 'Easy')];
const S = (problem_id, verdict, minute) => ({ problem_id, verdict, created_at: new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString() });

test('insights: new learner gets easiest-first starters with a reason', () => {
  const r = buildInsights(problems, []);
  assert.ok(r.recommendations.length > 0);
  assert.ok(r.recommendations.every((x) => x.reason && x.kind));
  assert.equal(r.recommendations[0].difficulty, 'Easy');
  assert.equal(r.weakTopics.length, 0);
});
test('insights: repeated failures mark a topic weak and trigger retry + strengthen', () => {
  const subs = [S(1, 'wrong_answer', 1), S(1, 'wrong_answer', 2), S(2, 'time_limit_exceeded', 3), S(4, 'accepted', 4)];
  const r = buildInsights(problems, subs);
  assert.deepEqual(r.weakTopics.map((w) => w.category), ['Graphs']);
  const kinds = r.recommendations.map((x) => x.kind);
  assert.ok(kinds.includes('retry'));
  assert.ok(r.recommendations.find((x) => x.kind === 'retry').reason.includes('time limit exceeded') || r.recommendations.find((x) => x.kind === 'retry').reason.includes('wrong answer'));
});
test('insights: solved problems are never recommended again', () => {
  const subs = [S(1, 'accepted', 1), S(4, 'accepted', 2), S(5, 'accepted', 3), S(7, 'accepted', 4)];
  const r = buildInsights(problems, subs);
  const solved = new Set([1, 4, 5, 7]);
  assert.ok(r.recommendations.every((x) => !solved.has(x.problemId)));
});
test('insights: a failure that is later solved is not "unsolved"', () => {
  const r = buildInsights(problems, [S(1, 'wrong_answer', 1), S(1, 'accepted', 2)]);
  assert.ok(!r.recommendations.some((x) => x.problemId === 1));
  assert.equal(r.difficulty.Easy.solved, 1);
});
test('insights: level-up appears once the easy tier is solid', () => {
  const easy = [P(11, 'Arrays', 'Easy'), P(12, 'Arrays', 'Easy'), P(13, 'Arrays', 'Easy'), P(14, 'Arrays', 'Medium')];
  const r = buildInsights(easy, [S(11, 'accepted', 1), S(12, 'accepted', 2), S(13, 'accepted', 3)]);
  assert.ok(r.recommendations.some((x) => x.kind === 'level_up' && x.problemId === 14));
});
test('insights: ignores submissions for problems that no longer exist', () => {
  assert.doesNotThrow(() => buildInsights(problems, [S(999, 'accepted', 1)]));
});

// ---- daily totals
test('dailyTotals: buckets completed sessions by local day, oldest first', () => {
  const now = new Date();
  const sessions = [
    { ended_at: now.toISOString(), started_at: now.toISOString(), accumulated_seconds: 600 },
    { ended_at: now.toISOString(), started_at: now.toISOString(), accumulated_seconds: 300 },
    { ended_at: new Date(now.getTime() - 86_400_000).toISOString(), started_at: now.toISOString(), accumulated_seconds: 100 },
    { ended_at: new Date(now.getTime() - 40 * 86_400_000).toISOString(), started_at: now.toISOString(), accumulated_seconds: 999 },
  ];
  const d = dailyTotals(sessions, 7, 'UTC');
  assert.equal(d.length, 7);
  assert.equal(d[6].seconds, 900);
  assert.equal(d[5].seconds, 100);
  assert.equal(d.reduce((n, x) => n + x.seconds, 0), 1000);
});
test('safeTimeZone: falls back to UTC for junk', () => {
  assert.equal(safeTimeZone('Asia/Kolkata'), 'Asia/Kolkata');
  assert.equal(safeTimeZone('Not/AZone'), 'UTC');
});

console.log(failed === 0 ? '\nAll library checks passed.' : `\n${failed} library check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
