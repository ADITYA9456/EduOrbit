// Validation and normalisation for admin-authored problems. Shared by the create and update routes.

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const LIMITS = { title: 120, description: 20000, category: 60, tag: 30, tags: 12, constraint: 200, constraints: 20, format: 2000, editorial: 30000, testBytes: 200_000, tests: 100 };

const str = (v) => (typeof v === 'string' ? v : '');
const lines = (v) => (Array.isArray(v) ? v : str(v).split('\n')).map((s) => str(s).trim()).filter(Boolean);

export const slugify = (title) =>
  title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export function parseProblemInput(body) {
  const errors = {};
  const title = str(body?.title).trim();
  const description = str(body?.description).trim();
  const category = str(body?.category).trim();
  const difficulty = str(body?.difficulty);
  const points = Number(body?.points);
  const timeLimit = Number(body?.time_limit_ms ?? 2000);
  const memoryLimit = Number(body?.memory_limit_kb ?? 262144);

  if (!title || title.length > LIMITS.title) errors.title = `Title is required (up to ${LIMITS.title} characters)`;
  if (!description || description.length > LIMITS.description) errors.description = 'Description is required';
  if (!category || category.length > LIMITS.category) errors.category = 'Category is required';
  if (!DIFFICULTIES.includes(difficulty)) errors.difficulty = 'Choose Easy, Medium or Hard';
  if (!Number.isInteger(points) || points < 1 || points > 1000) errors.points = 'Points must be a whole number from 1 to 1000';
  if (!Number.isInteger(timeLimit) || timeLimit < 500 || timeLimit > 15000) errors.time_limit_ms = 'Time limit must be 500 to 15000 ms';
  if (!Number.isInteger(memoryLimit) || memoryLimit < 16384 || memoryLimit > 1048576) errors.memory_limit_kb = 'Memory limit must be 16384 to 1048576 KB';

  const rawTags = Array.isArray(body?.tags) ? body.tags : str(body?.tags).split(',');
  const tags = [...new Set(rawTags.map((t) => str(t).trim()).filter(Boolean))].slice(0, LIMITS.tags);
  if (tags.some((t) => t.length > LIMITS.tag)) errors.tags = `Each tag can be up to ${LIMITS.tag} characters`;
  const constraints = lines(body?.constraints).slice(0, LIMITS.constraints);
  if (constraints.some((c) => c.length > LIMITS.constraint)) errors.constraints = 'A constraint line is too long';

  const rawTests = Array.isArray(body?.tests) ? body.tests : [];
  const tests = rawTests.map((t) => ({
    input: str(t?.input).replace(/\r\n/g, '\n'),
    expected_output: str(t?.expected_output).replace(/\r\n/g, '\n'),
    is_sample: Boolean(t?.is_sample),
  }));
  if (tests.length === 0) errors.tests = 'Add at least one test case';
  else if (tests.length > LIMITS.tests) errors.tests = `At most ${LIMITS.tests} test cases`;
  else if (!tests.some((t) => t.is_sample)) errors.tests = 'Mark at least one test as a sample so learners can see an example';
  else if (tests.some((t) => !t.expected_output.trim())) errors.tests = 'Every test needs an expected output';
  else if (tests.some((t) => Buffer.byteLength(t.input) > LIMITS.testBytes || Buffer.byteLength(t.expected_output) > LIMITS.testBytes)) {
    errors.tests = 'A test case is too large';
  }

  const starter = {};
  if (body?.starter_code && typeof body.starter_code === 'object') {
    for (const lang of ['python', 'javascript', 'java', 'cpp', 'c']) {
      if (typeof body.starter_code[lang] === 'string' && body.starter_code[lang].trim()) starter[lang] = body.starter_code[lang].slice(0, 20000);
    }
  }

  const editorial = str(body?.editorial).slice(0, LIMITS.editorial);
  const slug = slugify(str(body?.slug).trim() || title);
  if (!slug) errors.slug = 'Could not make a URL name from the title';

  if (Object.keys(errors).length) return { errors };

  const examples = tests
    .filter((t) => t.is_sample)
    .map((t) => ({ input: t.input.replace(/\n+$/, ''), output: t.expected_output.replace(/\n+$/, ''), explanation: '' }));

  return {
    problem: {
      slug, title, description, difficulty, category, type: 'code', tags, constraints, points, examples,
      starter_code: starter,
      input_format: str(body?.input_format).slice(0, LIMITS.format),
      output_format: str(body?.output_format).slice(0, LIMITS.format),
      time_limit_ms: timeLimit, memory_limit_kb: memoryLimit,
    },
    tests, editorial,
  };
}
