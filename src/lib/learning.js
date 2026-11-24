// Learning insights computed from a user's real submissions. Pure functions, no I/O.
// Every recommendation carries a plain-language reason so it can be explained to the user.

const LEVELS = ['Easy', 'Medium', 'Hard'];
const VERDICT_LABEL = {
  accepted: 'accepted',
  wrong_answer: 'wrong answer',
  compilation_error: 'compile error',
  runtime_error: 'runtime error',
  time_limit_exceeded: 'time limit exceeded',
  memory_limit_exceeded: 'memory limit exceeded',
};

const ratio = (a, b) => (b > 0 ? a / b : 0);

/**
 * @param {Array} problems    coding_problems rows: { id, title, slug, category, difficulty, tags, points }
 * @param {Array} submissions judge_submissions (kind = 'submit'), any order: { problem_id, verdict, created_at }
 */
export function buildInsights(problems, submissions) {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const perProblem = new Map();

  for (const s of [...submissions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
    if (!byId.has(s.problem_id)) continue;
    const e = perProblem.get(s.problem_id) || { attempts: 0, solved: false, lastVerdict: null, lastAt: null, failsBeforeSolve: 0 };
    e.attempts += 1;
    if (s.verdict === 'accepted') e.solved = true;
    else if (!e.solved) e.failsBeforeSolve += 1;
    e.lastVerdict = s.verdict;
    e.lastAt = s.created_at;
    perProblem.set(s.problem_id, e);
  }

  const categories = new Map();
  const difficulty = Object.fromEntries(LEVELS.map((d) => [d, { total: 0, solved: 0, attempted: 0 }]));

  for (const p of problems) {
    const c = categories.get(p.category) || { category: p.category, total: 0, attempted: 0, solved: 0, submissions: 0, accepted: 0 };
    c.total += 1;
    if (difficulty[p.difficulty]) difficulty[p.difficulty].total += 1;
    const e = perProblem.get(p.id);
    if (e) {
      c.attempted += 1;
      c.submissions += e.attempts;
      if (e.solved) {
        c.solved += 1;
        c.accepted += 1;
      }
      if (difficulty[p.difficulty]) {
        difficulty[p.difficulty].attempted += 1;
        if (e.solved) difficulty[p.difficulty].solved += 1;
      }
    }
    categories.set(p.category, c);
  }

  const categoryStats = [...categories.values()]
    .map((c) => ({ ...c, solveRate: ratio(c.solved, c.attempted), coverage: ratio(c.solved, c.total) }))
    .sort((a, b) => b.attempted - a.attempted || a.category.localeCompare(b.category));

  // Weak: you have tried at least two problems here and solved under half of them,
  // or you have submitted many times per solved problem.
  const weakTopics = categoryStats
    .filter((c) => c.attempted >= 2 && (c.solveRate < 0.5 || ratio(c.submissions, Math.max(c.solved, 1)) >= 4))
    .map((c) => ({
      category: c.category,
      reason: `You solved ${c.solved} of the ${c.attempted} problem${c.attempted === 1 ? '' : 's'} you tried here, over ${c.submissions} submission${c.submissions === 1 ? '' : 's'}.`,
    }));
  const strongTopics = categoryStats
    .filter((c) => c.solved >= 2 && c.solveRate >= 0.75)
    .map((c) => ({ category: c.category, reason: `You solved ${c.solved} of ${c.attempted} attempted.` }));

  const recommendations = [];
  const used = new Set();
  const push = (problem, kind, reason) => {
    if (!problem || used.has(problem.id) || recommendations.length >= 6) return;
    used.add(problem.id);
    recommendations.push({
      problemId: problem.id, slug: problem.slug, title: problem.title,
      category: problem.category, difficulty: problem.difficulty, kind, reason,
    });
  };

  const unsolved = problems.filter((p) => !perProblem.get(p.id)?.solved);
  const levelRank = (d) => LEVELS.indexOf(d);

  // 1. Retry: tried but not solved, most recent first.
  [...unsolved]
    .filter((p) => perProblem.has(p.id))
    .sort((a, b) => new Date(perProblem.get(b.id).lastAt) - new Date(perProblem.get(a.id).lastAt))
    .slice(0, 2)
    .forEach((p) => {
      const e = perProblem.get(p.id);
      push(p, 'retry', `You have tried this ${e.attempts} time${e.attempts === 1 ? '' : 's'}; the last result was ${VERDICT_LABEL[e.lastVerdict] || e.lastVerdict}.`);
    });

  // 2. Strengthen a weak topic with easier problems first.
  for (const w of weakTopics.slice(0, 2)) {
    unsolved
      .filter((p) => p.category === w.category && !perProblem.has(p.id))
      .sort((a, b) => levelRank(a.difficulty) - levelRank(b.difficulty))
      .slice(0, 1)
      .forEach((p) => push(p, 'strengthen', `${w.category} is a weak spot. ${w.reason} This one is ${p.difficulty.toLowerCase()}.`));
  }

  // 3. Level up: solid on a level overall, so offer the next one in a topic you already work on.
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const cur = difficulty[LEVELS[i]];
    if (cur.solved >= 3 && ratio(cur.solved, cur.total) >= 0.6) {
      const next = LEVELS[i + 1];
      const favourite = categoryStats.find((c) => c.solved > 0)?.category;
      unsolved
        .filter((p) => p.difficulty === next && !perProblem.has(p.id))
        .sort((a, b) => (a.category === favourite ? -1 : 0) - (b.category === favourite ? -1 : 0))
        .slice(0, 1)
        .forEach((p) => push(p, 'level_up', `You have solved ${cur.solved} of ${cur.total} ${LEVELS[i]} problems, so you are ready to try ${next}.`));
    }
  }

  // 4. Broaden: topics you have not touched yet.
  categoryStats
    .filter((c) => c.attempted === 0)
    .forEach((c) => {
      unsolved
        .filter((p) => p.category === c.category)
        .sort((a, b) => levelRank(a.difficulty) - levelRank(b.difficulty))
        .slice(0, 1)
        .forEach((p) => push(p, 'explore', `You have not tried ${c.category} yet. This is the gentlest problem in it.`));
    });

  // 5. Fallback: nothing else applies (new user), start with the easiest unsolved problems.
  if (recommendations.length === 0) {
    [...unsolved]
      .sort((a, b) => levelRank(a.difficulty) - levelRank(b.difficulty) || a.title.localeCompare(b.title))
      .slice(0, 3)
      .forEach((p) => push(p, 'start', 'A good place to start: easy, and it works out the basics.'));
  }

  return { categoryStats, difficulty, weakTopics, strongTopics, recommendations };
}

/** Sum seconds per local day for the last `days` days ending today (inclusive). */
export function dailyTotals(sessions, days, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dayKey = (d) => fmt.format(d);
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    out.push({ date: dayKey(new Date(today.getTime() - i * 86_400_000)), seconds: 0 });
  }
  const index = new Map(out.map((d, i) => [d.date, i]));
  for (const s of sessions) {
    const i = index.get(dayKey(new Date(s.ended_at || s.started_at)));
    if (i != null) out[i].seconds += s.accumulated_seconds || 0;
  }
  return out;
}

export function safeTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}
