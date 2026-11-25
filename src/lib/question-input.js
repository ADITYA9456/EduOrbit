// Validation for the legacy /api/questions admin routes. Only these fields can be set (no mass assignment).
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TYPES = ['code', 'mcq', 'sql', 'project'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, maxItems, maxLen) =>
  (Array.isArray(v) ? v : []).filter((s) => typeof s === 'string').map((s) => s.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems);
const intIn = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export function parseQuestionBody(body, { partial = false } = {}) {
  const out = {};
  const errors = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (!partial || has('title')) {
    out.title = str(body?.title, 200);
    if (!out.title) errors.title = 'Title is required';
  }
  if (!partial || has('description')) {
    out.description = str(body?.description, 20000);
    if (!out.description) errors.description = 'Description is required';
  }
  if (has('slug') && body.slug) out.slug = str(body.slug, 100).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (has('category') || !partial) out.category = str(body?.category, 60) || 'DSA';
  if (has('type') || !partial) {
    const type = body?.type || 'code';
    if (!TYPES.includes(type)) errors.type = 'Invalid type';
    else out.type = type;
  }
  if (has('difficulty') || !partial) {
    const difficulty = body?.difficulty || 'Easy';
    if (!DIFFICULTIES.includes(difficulty)) errors.difficulty = 'Invalid difficulty';
    else out.difficulty = difficulty;
  }
  if (has('tags') || !partial) out.tags = strList(body?.tags, 12, 30);
  if (has('constraints') || !partial) out.constraints = strList(body?.constraints, 20, 200);
  if (has('points') || !partial) out.points = intIn(body?.points, 1, 1000, 10);
  if (has('order_index') || !partial) out.order_index = intIn(body?.order_index, 0, 100000, 0);
  for (const key of ['starter_code', 'examples', 'mcq_options']) {
    if (has(key) || !partial) {
      const v = body?.[key];
      const okShape = key === 'starter_code' ? v && typeof v === 'object' && !Array.isArray(v) : Array.isArray(v);
      const value = okShape ? v : key === 'starter_code' ? {} : [];
      if (JSON.stringify(value).length > 50000) errors[key] = 'Too large';
      else out[key] = value;
    }
  }
  const answer = has('correct_answer') ? str(body.correct_answer, 500) : undefined;
  return { fields: out, answer, errors: Object.keys(errors).length ? errors : null };
}