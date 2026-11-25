import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Never send answer keys, legacy test cases or editorials to the browser.
const publicProblem = (p) => {
  if (!p) return p;
  const { correct_answer: _a, test_cases: _t, editorial: _e, ...rest } = p;
  return rest;
};

// GET /api/daily-challenge: today's challenge (UTC date).
// If none is stored yet, one is chosen deterministically from the date, so every
// visitor sees the same problem even if the write below fails or races.
export async function GET() {
  try {
    const { supabase, supabaseAdmin } = createServerSupabase();
    const today = new Date().toISOString().split('T')[0];

    const { data: stored } = await supabase
      .from('daily_challenges')
      .select('question_id, coding_problems(*)')
      .eq('challenge_date', today)
      .maybeSingle();

    if (stored?.coding_problems) {
      return NextResponse.json({ challenge: publicProblem(stored.coding_problems), date: today });
    }

    const { data: pool } = await supabase
      .from('coding_problems')
      .select('id')
      .eq('type', 'code')
      .eq('judged', true)
      .order('id', { ascending: true });

    if (!pool || pool.length === 0) {
      return NextResponse.json({ challenge: null, date: today });
    }

    const dayNumber = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
    const pick = pool[dayNumber % pool.length];

    // daily_challenges is not writable with the user's own session; use the server client.
    const { error: writeError } = await supabaseAdmin
      .from('daily_challenges')
      .upsert({ question_id: pick.id, challenge_date: today }, { onConflict: 'challenge_date' });
    if (writeError) console.error('daily-challenge write failed:', writeError.message);

    const { data: problem } = await supabase.from('coding_problems').select('*').eq('id', pick.id).single();
    return NextResponse.json({ challenge: publicProblem(problem), date: today });
  } catch (err) {
    console.error('daily-challenge failed:', err);
    return NextResponse.json({ error: 'Could not load the daily challenge' }, { status: 500 });
  }
}
