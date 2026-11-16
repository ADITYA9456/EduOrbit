import { LANGUAGES, LIMITS, languageId } from './config';
import { VERDICTS, overallVerdict, truncate, verdictForExecution } from './compare';
import { executeBatch } from './judge0';

function limitsFor(problem, language) {
  const cpuMs = problem?.time_limit_ms || 2000;
  const cpuSeconds = Math.min((cpuMs / 1000) * LANGUAGES[language].cpuFactor, LIMITS.maxCpuSeconds);
  return { cpuSeconds, memoryKb: problem?.memory_limit_kb || 262144 };
}

/** Runs code once against arbitrary stdin (the console). No verdict, just the output. */
export async function runCustom({ problem, language, code, stdin }) {
  const { cpuSeconds, memoryKb } = limitsFor(problem, language);
  const [exec] = await executeBatch([
    { languageId: languageId(language), source: code, stdin, cpuSeconds, memoryKb },
  ]);
  const verdict =
    exec.status.id === 3 ? 'completed' : verdictForExecution(exec, '', memoryKb);
  return {
    verdict,
    stdout: truncate(exec.stdout, LIMITS.maxOutputChars),
    stderr: truncate(exec.stderr || exec.message, LIMITS.maxOutputChars),
    compileOutput: truncate(exec.compile_output, LIMITS.maxOutputChars),
    runtimeMs: exec.time,
    memoryKb: exec.memory,
  };
}

/**
 * Judges code against tests. Hidden tests contribute only a verdict, runtime and memory:
 * their input, expected output and the program's output never leave this function.
 * tests: [{ position, is_sample, input, expected_output }]
 */
export async function judgeTests({ problem, language, code, tests }) {
  const { cpuSeconds, memoryKb } = limitsFor(problem, language);
  const id = languageId(language);

  const execs = await executeBatch(
    tests.map((t) => ({ languageId: id, source: code, stdin: t.input, cpuSeconds, memoryKb }))
  );

  const results = tests.map((t, i) => {
    const exec = execs[i];
    const verdict = verdictForExecution(exec, t.expected_output, memoryKb);
    const base = {
      index: i + 1,
      sample: !!t.is_sample,
      verdict,
      runtimeMs: exec.time,
      memoryKb: exec.memory,
    };
    if (!t.is_sample) return base;
    return {
      ...base,
      input: truncate(t.input, LIMITS.maxOutputChars),
      expected: truncate(t.expected_output, LIMITS.maxOutputChars),
      actual: truncate(exec.stdout, LIMITS.maxOutputChars),
      stderr: truncate(exec.stderr || exec.message, LIMITS.maxOutputChars),
    };
  });

  const compileOutput =
    results.some((r) => r.verdict === VERDICTS.COMPILATION_ERROR)
      ? truncate(execs.find((e) => e.status.id === 6)?.compile_output, LIMITS.maxOutputChars)
      : '';

  const times = results.map((r) => r.runtimeMs).filter((n) => n != null);
  const mems = results.map((r) => r.memoryKb).filter((n) => n != null);

  return {
    verdict: overallVerdict(results),
    results,
    compileOutput,
    passed: results.filter((r) => r.verdict === VERDICTS.ACCEPTED).length,
    total: results.length,
    runtimeMs: times.length ? Math.max(...times) : null,
    memoryKb: mems.length ? Math.max(...mems) : null,
  };
}
