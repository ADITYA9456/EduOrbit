import { rateLimit } from '@/lib/memory-cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const REPORT_THRESHOLD = 10; // Auto-unpublish after this many reports
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Report a video
export async function POST(request) {
  try {
    const { supabase, supabaseAdmin } = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: account } = await supabaseAdmin.from('profiles').select('banned').eq('id', user.id).maybeSingle();
    if (account?.banned) return NextResponse.json({ error: 'This account has been suspended.' }, { status: 403 });

    const limit = rateLimit(`video-report:${user.id}`, 20, 60 * 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many reports. Try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const videoId = str(body?.videoId, 40);
    const reason = str(body?.reason, 100);
    const description = str(body?.description, 1000);

    if (!UUID.test(videoId) || !reason) {
      return NextResponse.json({ error: 'A valid videoId and a reason are required' }, { status: 400 });
    }

    const { data: video } = await supabaseAdmin.from('videos').select('id').eq('id', videoId).maybeSingle();
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    // Duplicate check (the database also enforces one report per user per video after migration 005)
    const { data: existingReport } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('video_id', videoId)
      .eq('reporter_id', user.id)
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json({ error: 'You have already reported this video' }, { status: 409 });
    }

    // Insert with the user's own session so row-level security applies (reporter must be the caller).
    const { error } = await supabase.from('reports').insert({
      video_id: videoId,
      reporter_id: user.id,
      reason,
      description,
    });

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'You have already reported this video' }, { status: 409 });
      console.error('videos/report failed:', error.message);
      return NextResponse.json({ error: 'Could not send your report' }, { status: 500 });
    }

    // Count with the service role: a user's own session can only see their own reports,
    // so counting with it would never reach the threshold.
    const { count } = await supabaseAdmin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('status', 'pending');

    if ((count || 0) >= REPORT_THRESHOLD) {
      await supabaseAdmin.from('videos').update({ status: 'rejected' }).eq('id', videoId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('videos/report failed:', err);
    return NextResponse.json({ error: 'Could not send your report' }, { status: 500 });
  }
}
