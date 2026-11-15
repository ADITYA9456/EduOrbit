/* eslint-disable no-console */
// Scenario tests for src/lib/judge against an executor. Run:
//   node --import ./scripts/judge-register.mjs scripts/test-judge.mjs
// With no JUDGE0_URL it starts the unsandboxed local dev shim (see dev-judge0-shim.js).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let shim = null;
if (!process.env.JUDGE0_URL) {
  process.env.JUDGE0_URL = 'http://127.0.0.1:2358';
  shim = spawn(process.execPath, [path.join(here, 'dev-judge0-shim.js')], { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 800));
  console.log('Executor: LOCAL DEV SHIM (not Judge0, not a sandbox)\n');
}

const { judgeTests, runCustom } = await import('../src/lib/judge/run.js');
const { JudgeError } = await import('../src/lib/judge/judge0.js');
const { getJudgeConfig } = await import('../src/lib/judge/config.js');

const problem = { time_limit_ms: 500, memory_limit_kb: 262144 };
const tests = [
  { position: 1, is_sample: true, input: '1 2\n', expected_output: '3\n' },
  { position: 2, is_sample: false, input: '-5 5\n', expected_output: '0\n' },
  { position: 3, is_sample: false, input: '1000000000 1000000000\n', expected_output: '2000000000\n' },
];

const progs = {
  python: {
    ok: 'a, b = map(int, input().split())\nprint(a + b)\n',
    wrong: 'a, b = map(int, input().split())\nprint(a + b + 1)\n',
    runtime: 'a, b = map(int, input().split())\nprint(a // 0)\n',
    loop: 'while True:\n    pass\n',
    empty: 'import sys\nd = sys.stdin.read()\nprint("EMPTY" if d == "" else "DATA")\n',
    compile: null,
  },
  javascript: {
    ok: "const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
    wrong: "const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b + 1);\n",
    runtime: "throw new Error('boom');\n",
    loop: 'while (true) {}\n',
    empty: "const d = require('fs').readFileSync(0, 'utf8');\nconsole.log(d === '' ? 'EMPTY' : 'DATA');\n",
    compile: null,
  },
  java: {
    ok: 'import java.util.*;\npublic class Main { public static void main(String[] x) { Scanner s = new Scanner(System.in); long a = s.nextLong(), b = s.nextLong(); System.out.println(a + b); } }\n',
    wrong: 'import java.util.*;\npublic class Main { public static void main(String[] x) { Scanner s = new Scanner(System.in); long a = s.nextLong(), b = s.nextLong(); System.out.println(a + b + 1); } }\n',
    runtime: 'public class Main { public static void main(String[] x) { int[] a = new int[1]; a[3] = 1; } }\n',
    loop: 'public class Main { public static void main(String[] x) { while (true) {} } }\n',
    empty: 'import java.io.*;\npublic class Main { public static void main(String[] x) throws Exception { System.out.println(System.in.read() == -1 ? "EMPTY" : "DATA"); } }\n',
    compile: 'public class Main { public static void main(String[] x) { int y = "text"; } }\n',
  },
  cpp: {
    ok: '#include <iostream>\nint main() { long long a, b; std::cin >> a >> b; std::cout << a + b << "\\n"; }\n',
    wrong: '#include <iostream>\nint main() { long long a, b; std::cin >> a >> b; std::cout << a + b + 1 << "\\n"; }\n',
    runtime: '#include <iostream>\nint main() { int z = 0; std::cout << 1 / z; return 3; }\n',
    loop: 'int main() { volatile int i = 0; while (true) { i = i + 1; } }\n',
    empty: '#include <iostream>\nint main() { int c = std::cin.get(); std::cout << (c == EOF ? "EMPTY" : "DATA") << "\\n"; }\n',
    compile: 'int main() { return undefined_symbol; }\n',
  },
  c: {
    ok: '#include <stdio.h>\nint main(void) { long long a, b; scanf("%lld %lld", &a, &b); printf("%lld\\n", a + b); return 0; }\n',
    wrong: '#include <stdio.h>\nint main(void) { long long a, b; scanf("%lld %lld", &a, &b); printf("%lld\\n", a + b + 1); return 0; }\n',
    runtime: 'int main(void) { return 7; }\n',
    loop: 'int main(void) { volatile int i = 0; for (;;) { i++; } }\n',
    empty: '#include <stdio.h>\nint main(void) { int c = getchar(); puts(c == EOF ? "EMPTY" : "DATA"); return 0; }\n',
    compile: 'int main(void) { return ; ; syntax error }\n',
  },
};

let failed = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

for (const [language, p] of Object.entries(progs)) {
  console.log(`\n== ${language} ==`);
  const run = (code, t = tests) => judgeTests({ problem, language, code, tests: t });

  const ok = await run(p.ok);
  check('correct code -> accepted', ok.verdict === 'accepted' && ok.passed === 3, `${ok.passed}/${ok.total} ${ok.runtimeMs}ms`);
  check('hidden tests expose no input/expected/output',
    ok.results.filter((r) => !r.sample).every((r) => r.input === undefined && r.expected === undefined && r.actual === undefined));
  check('sample test shows input/expected/actual',
    ok.results[0].input === '1 2\n' && ok.results[0].expected === '3\n' && ok.results[0].actual.trim() === '3');

  const wrong = await run(p.wrong);
  check('incorrect code -> wrong_answer', wrong.verdict === 'wrong_answer' && wrong.passed === 0);

  if (p.compile) {
    const ce = await run(p.compile);
    check('compile error -> compilation_error', ce.verdict === 'compilation_error' && ce.compileOutput.length > 0, ce.compileOutput.split('\n')[0].slice(0, 70));
  }

  const re = await run(p.runtime);
  check('runtime error -> runtime_error', re.verdict === 'runtime_error', re.verdict);

  const started = Date.now();
  const tle = await run(p.loop, tests.slice(0, 1));
  check('infinite loop -> time_limit_exceeded', tle.verdict === 'time_limit_exceeded', `${tle.verdict} after ${Date.now() - started}ms`);

  const empty = await runCustom({ problem, language, code: p.empty, stdin: '' });
  check('empty input handled', empty.stdout.trim() === 'EMPTY', JSON.stringify(empty.stdout.trim()));

  const custom = await runCustom({ problem, language, code: p.ok, stdin: '40 2\n' });
  check('custom stdin run -> stdout', custom.verdict === 'completed' && custom.stdout.trim() === '42');
}

console.log('\n== failure handling ==');
const saved = process.env.JUDGE0_URL;
process.env.JUDGE0_URL = 'http://127.0.0.1:1';
try {
  await judgeTests({ problem, language: 'python', code: 'print(1)', tests: tests.slice(0, 1) });
  check('unreachable judge throws JudgeError', false);
} catch (e) {
  check('unreachable judge throws JudgeError(unavailable)', e instanceof JudgeError && e.code === 'unavailable', e.message.slice(0, 60));
}
process.env.JUDGE0_URL = '';
check('empty JUDGE0_URL -> not configured', getJudgeConfig().configured === false);
try {
  await judgeTests({ problem, language: 'python', code: 'print(1)', tests: tests.slice(0, 1) });
  check('not configured throws JudgeError(not_configured)', false);
} catch (e) {
  check('not configured throws JudgeError(not_configured)', e instanceof JudgeError && e.code === 'not_configured');
}
process.env.JUDGE0_URL = saved;

console.log(failed === 0 ? '\nAll judge scenarios passed.' : `\n${failed} check(s) FAILED.`);
shim?.kill();
process.exit(failed === 0 ? 0 : 1);
