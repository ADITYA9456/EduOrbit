import { buildInsights, dailyTotals, safeTimeZone } from '@/lib/learning';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

// GET /api/dashboard?tz=Asia/Kolkata : everything the dashboard shows, computed from the caller's own rows.
export async function GET(request) {
  try {
    const { supabase } = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tz = safeTimeZone(new URL(request.url).searchParams.get('tz') || 'UTC');
    const since = new Date(Date.now() - 14 * DAY).toISOString();

    const [problems, subs, sessions, goals, plan, streak, current, profile] = await Promise.all([
      supabase.from('coding_problems').select('id, title, slug, category, difficulty, points, tags').eq('type', 'code'),
      supabase
        .from('judge_submissions')
        .select('problem_id, verdict, created_at')
        .eq('user_id', user.id)
        .eq('kind', 'submit')
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('study_sessions')
        .select('id, topic, started_at, ended_at, accumulated_seconds')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('started_at', since),
      supabase.from('study_goals').select('daily_minutes, weekly_problems').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('study_plan_items')
        .select('id, title, problem_id, due_date, done')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })
        .limit(100),
      supabase.rpc('my_streak', { p_tz: tz }),
      supabase.rpc('study_current'),
      supabase.from('profiles').select('total_points, problems_solved, badges').eq('id', user.id).maybeSingle(),
    ]);

    // The study/streak tables arrive with migration 004. Report that clearly instead of failing the whole page.
    const needsMigration = [sessions, goals, plan].some((r) => r.error && /does not exist|schema cache/i.test(r.error.message));
    const queryError = [problems, subs].find((r) => r.error);
    if (queryError) {
      console.error('dashboard query failed:', queryError.error.message);
      return NextResponse.json({ error: 'Could not load your dashboard' }, { status: 500 });
    }

    const insights = buildInsights(problems.data || [], subs.data || []);
    const days = dailyTotals(sessions.data || [], 14, tz);
    const sum = (list) => list.reduce((n, d) => n + d.seconds, 0);
    const thisWeek = days.slice(7);
    const lastWeek = days.slice(0, 7);

    const weekStart = Date.now() - 7 * DAY;
    const prevStart = Date.now() - 14 * DAY;
    const subsList = subs.data || [];
    const inRange = (s, from, to) => {
      const t = new Date(s.created_at).getTime();
      return t >= from && t < to;
    };
    const solvedBefore = new Set(subsList.filter((s) => s.verdict === 'accepted' && new Date(s.created_at).getTime() < weekStart).map((s) => s.problem_id));
    const solvedThisWeek = new Set(
      subsList.filter((s) => s.verdict === 'accepted' && inRange(s, weekStart, Infinity) && !solvedBefore.has(s.problem_id)).map((s) => s.problem_id)
    );
    const weekSubs = subsList.filter((s) => inRange(s, weekStart, Infinity));
    const prevSubs = subsList.filter((s) => inRange(s, prevStart, weekStart));

    const goalRow = goals.data || { daily_minutes: 60, weekly_problems: 5 };
    const todaySeconds = days[days.length - 1]?.seconds || 0;
    const currentSession = Array.isArray(current.data) ? current.data[0] : null;

    return NextResponse.json({
      needsMigration,
      timezone: tz,
      profile: profile.data || null,
      streak: streak.data?.[0] || { current_streak: 0, longest_streak: 0, active_today: false },
      goals: goalRow,
      today: { studySeconds: todaySeconds, goalSeconds: goalRow.daily_minutes * 60 },
      session: currentSession,
      days,
      weekly: {
        studySeconds: sum(thisWeek),
        previousStudySeconds: sum(lastWeek),
        problemsSolved: solvedThisWeek.size,
        goalProblems: goalRow.weekly_problems,
        submissions: weekSubs.length,
        accepted: weekSubs.filter((s) => s.verdict === 'accepted').length,
        previousSubmissions: prevSubs.length,
        previousAccepted: prevSubs.filter((s) => s.verdict === 'accepted').length,
      },
      plan: plan.data || [],
      insights,
      totals: { problems: (problems.data || []).length, solved: new Set(subsList.filter((s) => s.verdict === 'accepted').map((s) => s.problem_id)).size },
    });
  } catch (err) {
    console.error('dashboard failed:', err);
    return NextResponse.json({ error: 'Could not load your dashboard' }, { status: 500 });
  }
}
