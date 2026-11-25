import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/audit';
import { parseProblemInput } from '@/lib/problem-input';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const badId = () => NextResponse.json({ error: 'Invalid problem id' }, { status: 400 });

// GET: the full problem including hidden tests (admin only)
export async function GET(_request, { params }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  if (!UUID.test(params.id)) return badId();
  const { admin } = gate;

  const { data: problem } = await admin.from('coding_problems').select('*').eq('id', params.id).maybeSingle();
  if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
  const { data: tests } = await admin
    .from('problem_tests')
    .select('position, is_sample, input, expected_output')
    .eq('problem_id', params.id)
    .order('position', { ascending: true });
  const { data: ed } = await admin.from('problem_editorials').select('body').eq('problem_id', params.id).maybeSingle();
  return NextResponse.json({ problem: { ...problem, editorial: ed?.body || problem.editorial || '' }, tests: tests || [] });
}

// PUT: replace the problem and its tests
export async function PUT(request, { params }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  if (!UUID.test(params.id)) return badId();
  const { admin } = gate;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = parseProblemInput(body);
  if (parsed.errors) return NextResponse.json({ error: 'Please fix the highlighted fields', fields: parsed.errors }, { status: 400 });

  const { data: existing } = await admin.from('coding_problems').select('id, slug').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });

  const { data: clash } = await admin.from('coding_problems').select('id').eq('slug', parsed.problem.slug).neq('id', params.id).maybeSingle();
  if (clash) return NextResponse.json({ error: 'Another problem already uses this URL name', fields: { title: 'Pick a different title' } }, { status: 409 });

  const { error } = await admin.from('coding_problems').update({ ...parsed.problem, judged: true }).eq('id', params.id);
  if (error) {
    console.error('admin problem update failed:', error.message);
    return NextResponse.json({ error: 'Could not update the problem' }, { status: 500 });
  }

  // Keep the old tests until the new ones are in, so a failure never leaves a problem without tests.
  const { data: oldTests } = await admin.from('problem_tests').select('id').eq('problem_id', params.id);
  const rows = parsed.tests.map((t, i) => ({ problem_id: params.id, position: 1000 + i + 1, ...t }));
  const { error: insertError } = await admin.from('problem_tests').insert(rows);
  if (insertError) {
    console.error('admin tests insert failed:', insertError.message);
    return NextResponse.json({ error: 'Could not save the test cases' }, { status: 500 });
  }
  if (oldTests?.length) await admin.from('problem_tests').delete().in('id', oldTests.map((t) => t.id));
  const fresh = parsed.tests.map((_, i) => i + 1);
  await Promise.all(fresh.map((n) => admin.from('problem_tests').update({ position: n }).eq('problem_id', params.id).eq('position', 1000 + n)));

  const { error: edError } = await admin
    .from('problem_editorials')
    .upsert({ problem_id: params.id, body: parsed.editorial, updated_at: new Date().toISOString() }, { onConflict: 'problem_id' });
  if (edError && /does not exist|schema cache/i.test(edError.message)) {
    await admin.from('coding_problems').update({ editorial: parsed.editorial }).eq('id', params.id);
  }
  await logAdminAction(admin, gate.user.id, 'problem.update', 'problem', params.id, { slug: parsed.problem.slug, tests: rows.length });
  return NextResponse.json({ ok: true, slug: parsed.problem.slug });
}

// DELETE: remove the problem (tests, drafts, submissions cascade)
export async function DELETE(_request, { params }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  if (!UUID.test(params.id)) return badId();
  const { error } = await gate.admin.from('coding_problems').delete().eq('id', params.id);
  if (error) {
    console.error('admin problem delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete the problem' }, { status: 500 });
  }
  await logAdminAction(gate.admin, gate.user.id, 'problem.delete', 'problem', params.id);
  return NextResponse.json({ ok: true });
}
