import { checkAiQuota, recordAiUse } from '@/lib/ai-usage';
import { aiErrorResponse, generate } from '@/lib/gemini';
import { buildInsights } from '@/lib/learning';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

function describeUser(insights, totals) {
  const lines = [`Problems solved: ${totals.solved} of ${totals.problems} available.`];
  const d = insights.difficulty;
  lines.push(`By difficulty (solved/total): Easy ${d.Easy.solved}/${d.Easy.total}, Medium ${d.Medium.solved}/${d.Medium.total}, Hard ${d.Hard.solved}/${d.Hard.total}.`);
  if (insights.weakTopics.length) lines.push(`Weak topics: ${insights.weakTopics.map((w) => `${w.category} (${w.reason})`).join(' ')}`);
  if (insights.strongTopics.length) lines.push(`Strong topics: ${insights.strongTopics.map((s) => s.category).join(', ')}.`);
  if (insights.recommendations.length) {
    lines.push(`Suggested next problems: ${insights.recommendations.map((r) => `${r.title} [${r.difficulty}, ${r.category}]`).join('; ')}.`);
  }
  return lines.join('\n');
}

// POST /api/ai/chat { message, history? }: a study assistant grounded in the caller's own progress.
export async function POST(request) {
  try {
    const { supabase, supabaseAdmin: admin } = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in to use the study assistant' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const message = clip(body?.message, 1000);
    if (!message) return NextResponse.json({ error: 'Write a question first' }, { status: 400 });

    const history = (Array.isArray(body?.history) ? body.history : [])
      .slice(-6)
      .map((h) => ({ role: h?.role === 'model' ? 'model' : 'user', text: clip(h?.text, 1000) }))
      .filter((h) => h.text);

    const quota = await checkAiQuota(admin, user.id, 'chat');
    if (!quota.ok) {
      return NextResponse.json(
        { error: `You have reached the limit of ${quota.limit} assistant messages per hour. Try again later.` },
        { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } }
      );
    }

    const [problems, subs] = await Promise.all([
      supabase.from('coding_problems').select('id, title, slug, category, difficulty, points, tags').eq('type', 'code'),
      supabase.from('judge_submissions').select('problem_id, verdict, created_at').eq('user_id', user.id).eq('kind', 'submit').limit(2000),
    ]);
    const insights = buildInsights(problems.data || [], subs.data || []);
    const solved = new Set((subs.data || []).filter((s) => s.verdict === 'accepted').map((s) => s.problem_id)).size;

    const system = [
      'You are the study assistant inside EduOrbit, a platform for learning from video and practising coding problems.',
      'Answer in plain, friendly language, in under 200 words unless the user asks for more.',
      'Use ONLY the facts below when talking about this learner. If something is not listed, say you do not know it. Never invent progress, scores or problems.',
      'When helping with a coding problem, explain ideas and give hints; do not paste a complete solution unless the learner explicitly asks for one.',
      '',
      "Learner's progress:",
      describeUser(insights, { solved, problems: (problems.data || []).length }),
    ].join('\n');

    const text = await generate({ system, turns: [...history, { role: 'user', text: message }], maxTokens: 600 });
    await recordAiUse(admin, user.id, 'chat');
    return NextResponse.json({ reply: text });
  } catch (err) {
    const mapped = aiErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status });
    console.error('ai/chat failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
