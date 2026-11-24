import { checkAiQuota, recordAiUse } from '@/lib/ai-usage';
import { aiErrorResponse, generate } from '@/lib/gemini';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/ai/hint { problemId, code?, language? }: a nudge, never the full solution.
export async function POST(request) {
  try {
    const { supabase, supabaseAdmin: admin } = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in to get a hint' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (typeof body?.problemId !== 'string' || !UUID.test(body.problemId)) {
      return NextResponse.json({ error: 'A valid problemId is required' }, { status: 400 });
    }
    const code = typeof body.code === 'string' ? body.code.slice(0, 6000) : '';
    const language = typeof body.language === 'string' ? body.language.slice(0, 20) : '';

    const quota = await checkAiQuota(admin, user.id, 'hint');
    if (!quota.ok) {
      return NextResponse.json(
        { error: `You have used ${quota.limit} hints this hour. Try again later.` },
        { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } }
      );
    }

    const { data: problem } = await supabase
      .from('coding_problems')
      .select('title, description, difficulty, category, constraints, input_format, output_format')
      .eq('id', body.problemId)
      .maybeSingle();
    if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });

    const system = [
      'You give hints for coding practice problems on EduOrbit.',
      'Give ONE short hint (at most 80 words) that nudges the learner toward the key idea or points at a likely bug.',
      'Never write the full solution or complete code. Do not reveal the final algorithm step by step.',
    ].join(' ');
    const prompt = [
      `Problem: ${problem.title} (${problem.difficulty}, ${problem.category})`,
      problem.description,
      problem.input_format ? `Input: ${problem.input_format}` : '',
      problem.output_format ? `Output: ${problem.output_format}` : '',
      code ? `The learner's current ${language || ''} code:\n${code}` : "The learner has not written any code yet.",
      'Give a hint.',
    ].filter(Boolean).join('\n\n');

    const hint = await generate({ system, turns: [{ role: 'user', text: prompt }], maxTokens: 220, temperature: 0.3 });
    await recordAiUse(admin, user.id, 'hint');
    return NextResponse.json({ hint });
  } catch (err) {
    const mapped = aiErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status });
    console.error('ai/hint failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
