export const VERDICT_META = {
  accepted: { label: 'Accepted', ok: true },
  wrong_answer: { label: 'Wrong Answer', ok: false },
  compilation_error: { label: 'Compilation Error', ok: false },
  runtime_error: { label: 'Runtime Error', ok: false },
  time_limit_exceeded: { label: 'Time Limit Exceeded', ok: false },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', ok: false },
  internal_error: { label: 'Internal Error', ok: false },
  completed: { label: 'Finished', ok: true },
};

export function verdictLabel(verdict) {
  return VERDICT_META[verdict]?.label || verdict;
}

export function formatMemory(kb) {
  if (kb == null) return '—';
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function formatRuntime(ms) {
  return ms == null ? '—' : `${ms} ms`;
}
