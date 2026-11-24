import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/progress — get user's progress stats
export async function GET(request) {
  try {
    const { supabase } = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*, coding_problems(id, title, slug, category, difficulty, points)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Compute stats
    const solved = (progress || []).filter((p) => p.status === 'solved');
    const attempted = (progress || []).filter((p) => p.status === 'attempted');

    const byCategory = {};
    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };

    solved.forEach((p) => {
      const cat = p.coding_problems?.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      const diff = p.coding_problems?.difficulty || 'Easy';
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
    });

    const totalScore = solved.reduce((sum, p) => sum + (p.score || 0), 0);

    return NextResponse.json({
      progress: progress || [],
      stats: {
        totalSolved: solved.length,
        totalAttempted: attempted.length,
        totalScore,
        byCategory,
        byDifficulty,
      },
    });
  } catch (err) {
    console.error('GET /api/progress failed:', err);
    return NextResponse.json({ error: 'Could not load progress' }, { status: 500 });
  }
}

// POST /api/progress: record an answer to a multiple-choice problem.
// Correctness and score are decided here from the stored answer; nothing is trusted from the client.
export async function POST(request) {
  try {
    const { supabase } = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const questionId = typeof body?.questionId === 'string' ? body.questionId : '';
    const answer = typeof body?.submittedCode === 'string' ? body.submittedCode.slice(0, 500) : '';

    if (!/^[0-9a-f-]{36}$/i.test(questionId)) {
      return NextResponse.json({ error: 'A valid questionId is required' }, { status: 400 });
    }
    if (!answer) {
      return NextResponse.json({ error: 'An answer is required' }, { status: 400 });
    }

    const { data: problem } = await supabase
      .from('coding_problems')
      .select('id, type, correct_answer, points')
      .eq('id', questionId)
      .maybeSingle();

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }
    if (problem.type !== 'mcq') {
      return NextResponse.json({ error: 'Code problems are graded through the judge' }, { status: 400 });
    }

    const correct = answer === problem.correct_answer;
    const awarded = correct ? problem.points || 0 : 0;

    const { data: existing } = await supabase
      .from('user_progress')
      .select('id, status, score, attempts')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle();

    const row = {
      status: correct || existing?.status === 'solved' ? 'solved' : 'attempted',
      score: Math.max(existing?.score || 0, awarded),
      language_used: 'mcq',
      submitted_code: answer,
      attempts: (existing?.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const query = existing
      ? supabase.from('user_progress').update(row).eq('id', existing.id)
      : supabase.from('user_progress').insert({ ...row, user_id: user.id, question_id: questionId });
    const { data: saved, error } = await query.select().single();

    if (error) {
      console.error('POST /api/progress failed:', error);
      return NextResponse.json({ error: 'Could not save your progress' }, { status: 500 });
    }

    return NextResponse.json({ progress: saved, correct, awarded });
  } catch (err) {
    console.error('POST /api/progress failed:', err);
    return NextResponse.json({ error: 'Could not save your progress' }, { status: 500 });
  }
}
