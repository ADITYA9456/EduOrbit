// Output comparison and verdict mapping. Pure functions, no I/O.

export function normalizeOutput(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

export function outputsMatch(actual, expected) {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

export const VERDICTS = {
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  COMPILATION_ERROR: 'compilation_error',
  RUNTIME_ERROR: 'runtime_error',
  TIME_LIMIT: 'time_limit_exceeded',
  MEMORY_LIMIT: 'memory_limit_exceeded',
  INTERNAL_ERROR: 'internal_error',
};

// Judge0 status ids: 3 ok, 5 time limit, 6 compile error, 7-12 runtime errors,
// 13 internal error, 14 exec format error.
export function verdictForExecution(exec, expectedOutput, memoryLimitKb) {
  const id = exec.status?.id;
  if (id === 6) return VERDICTS.COMPILATION_ERROR;
  if (id === 5) return VERDICTS.TIME_LIMIT;
  if (id === 13 || id === 14 || id === undefined) return VERDICTS.INTERNAL_ERROR;
  if (id >= 7 && id <= 12) {
    // Judge0 reports an out-of-memory kill as a signal; treat a near-limit peak as MLE.
    if (memoryLimitKb && exec.memory && exec.memory >= memoryLimitKb * 0.95) return VERDICTS.MEMORY_LIMIT;
    return VERDICTS.RUNTIME_ERROR;
  }
  if (id === 3 || id === 4) {
    return outputsMatch(exec.stdout, expectedOutput) ? VERDICTS.ACCEPTED : VERDICTS.WRONG_ANSWER;
  }
  return VERDICTS.INTERNAL_ERROR;
}

// Overall verdict is the first failing test's verdict, in test order.
export function overallVerdict(testResults) {
  if (testResults.some((t) => t.verdict === VERDICTS.COMPILATION_ERROR)) return VERDICTS.COMPILATION_ERROR;
  const failed = testResults.find((t) => t.verdict !== VERDICTS.ACCEPTED);
  return failed ? failed.verdict : VERDICTS.ACCEPTED;
}

export function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max)}\n… (truncated)` : s;
}
