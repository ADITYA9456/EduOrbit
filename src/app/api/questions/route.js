import { requireAdmin } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/audit';
import { createServerSupabase } from '@/lib/supabase/server';
import { parseQuestionBody } from '@/lib/question-input';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function saveAnswerKey(admin, problemId, answer) {
  if (answer === undefined) return;
  const { error } = await admin
    .from('problem_answers')
    .upsert({ problem_id: problemId, correct_answer: answer, updated_at: new Date().toISOString() }, { onConflict: 'problem_id' });
  // Before migration 005 the table does not exist: keep the legacy column working.
  if (error && /does not exist|schema cache/i.test(error.message)) {
    await admin.from('coding_problems').update({ correct_answer: answer }).eq('id', problemId);
  } else if (error) {
    throw error;
  }
}

// GET /api/questions — list questions with filters
export async function GET(request) {
  try {
    const { supabase } = createServerSupabase();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const type = searchParams.get('type');
    const search = (searchParams.get('search') || '').slice(0, 80).replace(/[%_\\]/g, ' ').trim();
    const tag = (searchParams.get('tag') || '').slice(0, 30);
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1), 10000);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('coding_problems')
      .select('id, title, slug, category, type, difficulty, tags, points, order_index, created_at', { count: 'exact' })
      .order('order_index', { ascending: true });

    if (category && category !== 'All') query = query.eq('category', category.slice(0, 60));
    if (difficulty && difficulty !== 'All') query = query.eq('difficulty', difficulty.slice(0, 10));
    if (type && type !== 'All') query = query.eq('type', type.slice(0, 10));
    if (search) query = query.ilike('title', `%${search}%`);
    if (tag) query = query.contains('tags', [tag]);

    query = query.range(offset, offset + limit - 1);

    const { data: questions, error, count } = await query;
    if (error) {
      console.error('GET /api/questions failed:', error.message);
      return NextResponse.json({ error: 'Could not load questions' }, { status: 500 });
    }

    return NextResponse.json({
      questions: questions || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('GET /api/questions failed:', err);
    return NextResponse.json({ error: 'Could not load questions' }, { status: 500 });
  }
}

// POST /api/questions — create question (admin only)
export async function POST(request) {
  try {
    const gate = await requireAdmin();
    if (gate.response) return gate.response;
    const { admin, user } = gate;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { fields, answer, errors } = parseQuestionBody(body);
    if (errors) return NextResponse.json({ error: 'Please fix the highlighted fields', fields: errors }, { status: 400 });

    const { data: question, error } = await admin
      .from('coding_problems')
      .insert({ ...fields, slug: fields.slug || undefined })
      .select()
      .single();
    if (error) {
      console.error('POST /api/questions failed:', error.message);
      return NextResponse.json({ error: 'Could not create the question' }, { status: 500 });
    }
    try {
      await saveAnswerKey(admin, question.id, answer);
    } catch (err) {
      console.error('answer key save failed:', err.message);
    }
    await logAdminAction(admin, user.id, 'problem.create', 'problem', question.id, { title: question.title });

    const { correct_answer: _key, test_cases: _tests, ...safe } = question;
    return NextResponse.json({ question: safe }, { status: 201 });
  } catch (err) {
    console.error('POST /api/questions failed:', err);
    return NextResponse.json({ error: 'Could not create the question' }, { status: 500 });
  }
}
