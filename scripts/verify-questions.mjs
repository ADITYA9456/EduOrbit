/* eslint-disable no-console */
// Runs the reference solutions of all 20 questions through the app's real judge pipeline
// (src/lib/judge: Judge0 client, verdict mapping, output comparison).
//
//   node --import ./scripts/judge-register.mjs scripts/verify-questions.mjs
//
// Needs JUDGE0_URL (+ JUDGE0_API_KEY if required). With no JUDGE0_URL it starts the
// unsandboxed local dev shim, which executes code with this machine's toolchains.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let shim = null;
if (!process.env.JUDGE0_URL) {
  process.env.JUDGE0_URL = 'http://127.0.0.1:2358';
  shim = spawn(process.execPath, [path.join(here, 'dev-judge0-shim.js')], { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 800));
  console.log('Using the LOCAL DEV SHIM (not Judge0, not a sandbox).');
} else {
  console.log(`Using JUDGE0_URL=${process.env.JUDGE0_URL}`);
}

const { judgeTests } = await import('../src/lib/judge/run.js');
const problems = JSON.parse(fs.readFileSync(path.join(here, 'questions', 'generated', 'problems.json'), 'utf8'));

let failures = 0;
for (const p of problems) {
  for (const [language, key] of [['python', 'py'], ['javascript', 'js']]) {
    const tests = p.tests.map((t, i) => ({ position: i + 1, is_sample: t.sample, input: t.input, expected_output: t.expected }));
    const started = Date.now();
    const out = await judgeTests({
      problem: { time_limit_ms: 2000, memory_limit_kb: 262144 },
      language,
      code: p[key],
      tests,
    });
    const ok = out.verdict === 'accepted' && out.passed === out.total;
    if (!ok) failures++;
    const bad = out.results.filter((r) => r.verdict !== 'accepted').map((r) => `#${r.index}:${r.verdict}`).join(' ');
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${p.slug.padEnd(34)} ${language.padEnd(10)} ${out.passed}/${out.total} ` +
        `maxRuntime=${out.runtimeMs}ms wall=${Date.now() - started}ms ${bad}`
    );
  }
}
console.log(failures === 0 ? '\nAll reference solutions accepted.' : `\n${failures} reference run(s) FAILED.`);
shim?.kill();
process.exit(failures === 0 ? 0 : 1);
