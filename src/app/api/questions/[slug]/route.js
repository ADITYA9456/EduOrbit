import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/audit';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { parseQuestionBody } from '@/lib/question-input';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/i;

// GET /api/questions/:slug — get single question by slug (never includes answer keys or hidden tests)
export async function GET(request, { params }) {
  try {
    const { supabase } = createServerSupabase();
    const { slug } = params;

    if (!slug || (!UUID.test(slug) && !SLUG.test(slug))) {
      return NextResponse.json({ error: 'A valid slug is required' }, { status: 400 });
    }

    const column = UUID.test(slug) ? 'id' : 'slug';
    const { data: question } = await supabase.from('coding_problems').select('*').eq(column, slug).maybeSingle();

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const { correct_answer: _key, test_cases: _tests, editorial: _ed, ...safe } = question;
    return NextResponse.json({ question: safe });
  } catch (err) {
    console.error('GET /api/questions/[slug] failed:', err);
    return NextResponse.json({ error: 'Could not load the question' }, { status: 500 });
  }
}

// PUT /api/questions/:slug — update question (admin only, allow-listed fields)
export async function PUT(request, { params }) {
  try {
    const gate = await requireAdmin();
    if (gate.response) return gate.response;
    const { admin, user } = gate;

    const { slug } = params;
    if (!slug || !SLUG.test(slug)) return NextResponse.json({ error: 'A valid slug is required' }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { fields, answer, errors } = parseQuestionBody(body, { partial: true });
    if (errors) return NextResponse.json({ error: 'Please fix the highlighted fields', fields: errors }, { status: 400 });
    if (Object.keys(fields).length === 0 && answer === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    let question;
    if (Object.keys(fields).length) {
      const { data, error } = await admin.from('coding_problems').update(fields).eq('slug', slug).select().maybeSingle();
      if (error) {
        console.error('PUT /api/questions failed:', error.message);
        return NextResponse.json({ error: 'Could not update the question' }, { status: 500 });
      }
      question = data;
    } else {
      question = (await admin.from('coding_problems').select().eq('slug', slug).maybeSingle()).data;
    }
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    if (answer !== undefined) {
      const { error } = await admin
        .from('problem_answers')
        .upsert({ problem_id: question.id, correct_answer: answer, updated_at: new Date().toISOString() }, { onConflict: 'problem_id' });
      if (error && /does not exist|schema cache/i.test(error.message)) {
        await admin.from('coding_problems').update({ correct_answer: answer }).eq('id', question.id);
      } else if (error) {
        console.error('answer key save failed:', error.message);
      }
    }
    await logAdminAction(admin, user.id, 'problem.update', 'problem', question.id, { fields: Object.keys(fields), answerChanged: answer !== undefined });

    const { correct_answer: _key, test_cases: _tests, ...safe } = question;
    return NextResponse.json({ question: safe });
  } catch (err) {
    console.error('PUT /api/questions failed:', err);
    return NextResponse.json({ error: 'Could not update the question' }, { status: 500 });
  }
}

// DELETE /api/questions/:slug — delete question (admin only)
export async function DELETE(request, { params }) {
  try {
    const gate = await requireAdmin();
    if (gate.response) return gate.response;
    const { admin, user } = gate;

    const { slug } = params;
    if (!slug || !SLUG.test(slug)) return NextResponse.json({ error: 'A valid slug is required' }, { status: 400 });

    const { data: gone, error } = await admin.from('coding_problems').delete().eq('slug', slug).select('id');
    if (error) {
      console.error('DELETE /api/questions failed:', error.message);
      return NextResponse.json({ error: 'Could not delete the question' }, { status: 500 });
    }
    await logAdminAction(admin, user.id, 'problem.delete', 'problem', gone?.[0]?.id ?? slug, { slug });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/questions failed:', err);
    return NextResponse.json({ error: 'Could not delete the question' }, { status: 500 });
  }
}
