import { rateLimit } from '@/lib/memory-cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tables holding the caller's own rows. Missing tables (older database) are skipped.
const SOURCES = [
  ['profile', 'profiles', 'id'],
  ['judge_submissions', 'judge_submissions', 'user_id'],
  ['judge_drafts', 'judge_drafts', 'user_id'],
  ['user_progress', 'user_progress', 'user_id'],
  ['bookmarks', 'bookmarks', 'user_id'],
  ['streaks', 'streaks', 'user_id'],
  ['study_sessions', 'study_sessions', 'user_id'],
  ['study_goals', 'study_goals', 'user_id'],
  ['study_plan_items', 'study_plan_items', 'user_id'],
  ['contest_participations', 'contest_participants', 'user_id'],
  ['contest_submissions', 'contest_submissions', 'user_id'],
  ['videos_submitted', 'videos', 'submitted_by'],
  ['reports_filed', 'reports', 'reporter_id'],
  ['contact_messages', 'contact_messages', 'user_id'],
  ['ai_usage', 'ai_usage', 'user_id'],
];

// GET /api/account/export: a machine-readable copy of the signed-in user's own personal data.
export async function GET() {
  try {
    const { supabase, supabaseAdmin: admin } = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = rateLimit(`account-export:${user.id}`, 3, 60 * 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'You can export your data a few times per hour. Try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const data = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email ?? null, phone: user.phone ?? null, createdAt: user.created_at ?? null, provider: user.app_metadata?.provider ?? null },
    };
    for (const [key, table, column] of SOURCES) {
      const { data: rows, error } = await admin.from(table).select('*').eq(column, user.id).limit(10000);
      if (error) {
        if (!/does not exist|schema cache/i.test(error.message)) console.error(`account export: ${table} failed:`, error.message);
        continue;
      }
      data[key] = key === 'profile' ? rows?.[0] ?? null : rows ?? [];
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="eduorbit-my-data.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('account export failed:', err);
    return NextResponse.json({ error: 'Could not export your data' }, { status: 500 });
  }
}
