import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/audit';
import { parseProblemInput } from '@/lib/problem-input';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function saveEditorial(admin, problemId, body) {
  const { error } = await admin
    .from('problem_editorials')
    .upsert({ problem_id: problemId, body, updated_at: new Date().toISOString() }, { onConflict: 'problem_id' });
  // Before migration 004 the table does not exist: keep the legacy column working.
  if (error && /does not exist|schema cache/i.test(error.message)) {
    await admin.from('coding_problems').update({ editorial: body }).eq('id', problemId);
  } else if (error) {
    throw error;
  }
}

// GET /api/admin/problems: list with test counts
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  const { admin } = gate;

  const [{ data: problems, error }, { data: tests }] = await Promise.all([
    admin.from('coding_problems').select('id, title, slug, difficulty, category, points, judged, type, created_at').order('created_at', { ascending: false }),
    admin.from('problem_tests').select('problem_id, is_sample'),
  ]);
  if (error) {
    console.error('admin problems list failed:', error.message);
    return NextResponse.json({ error: 'Could not load problems' }, { status: 500 });
  }
  const counts = {};
  (tests || []).forEach((t) => {
    const c = (counts[t.problem_id] ||= { samples: 0, hidden: 0 });
    if (t.is_sample) c.samples += 1;
    else c.hidden += 1;
  });
  return NextResponse.json({ problems: (problems || []).map((p) => ({ ...p, tests: counts[p.id] || { samples: 0, hidden: 0 } })) });
}

// POST /api/admin/problems: create a problem with its tests
export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  const { admin } = gate;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = parseProblemInput(body);
  if (parsed.errors) return NextResponse.json({ error: 'Please fix the highlighted fields', fields: parsed.errors }, { status: 400 });

  const { data: clash } = await admin.from('coding_problems').select('id').eq('slug', parsed.problem.slug).maybeSingle();
  if (clash) return NextResponse.json({ error: 'A problem with this URL name already exists', fields: { title: 'Pick a different title' } }, { status: 409 });

  const { data: created, error } = await admin
    .from('coding_problems')
    .insert({ ...parsed.problem, judged: false, order_index: 5000 })
    .select('id, slug')
    .single();
  if (error) {
    console.error('admin problem insert failed:', error.message);
    return NextResponse.json({ error: 'Could not create the problem' }, { status: 500 });
  }

  const rows = parsed.tests.map((t, i) => ({ problem_id: created.id, position: i + 1, ...t }));
  const { error: testsError } = await admin.from('problem_tests').insert(rows);
  if (testsError) {
    await admin.from('coding_problems').delete().eq('id', created.id);
    console.error('admin tests insert failed:', testsError.message);
    return NextResponse.json({ error: 'Could not save the test cases' }, { status: 500 });
  }

  try {
    if (parsed.editorial) await saveEditorial(admin, created.id, parsed.editorial);
  } catch (err) {
    console.error('editorial save failed:', err.message);
  }
  await admin.from('coding_problems').update({ judged: true }).eq('id', created.id);
  await logAdminAction(admin, gate.user.id, 'problem.create', 'problem', created.id, { slug: created.slug, tests: rows.length });
  return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 });
}
