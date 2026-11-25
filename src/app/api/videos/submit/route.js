import { CATEGORIES } from '@/lib/constants';
import { rateLimit } from '@/lib/memory-cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const THUMB = /^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\/[A-Za-z0-9_\-./]+$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Submit a new video for review
export async function POST(request) {
  try {
    const { supabase, supabaseAdmin: admin } = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: account } = await admin.from('profiles').select('banned').eq('id', user.id).maybeSingle();
    if (account?.banned) return NextResponse.json({ error: 'This account has been suspended.' }, { status: 403 });

    const limit = rateLimit(`video-submit:${user.id}`, 10, 60 * 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const videoId = str(body?.videoId, 11);
    const title = str(body?.title, 200);
    const category = str(body?.category, 60);
    if (!YT_ID.test(videoId) || !title || !category) {
      return NextResponse.json({ error: 'A valid videoId, title and category are required' }, { status: 400 });
    }
    if (!CATEGORIES.includes(category) || category === 'All') {
      return NextResponse.json({ error: 'Choose a valid category' }, { status: 400 });
    }
    const tags = (Array.isArray(body?.tags) ? body.tags : [])
      .filter((t) => typeof t === 'string')
      .map((t) => t.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 30);
    const thumb = str(body?.thumbnailUrl, 300);

    // Check with the service role: other people's pending videos are invisible to the user's own session.
    const { data: existing } = await admin.from('videos').select('id').eq('youtube_id', videoId).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'This video has already been submitted' }, { status: 409 });
    }

    // Inserted with the user's own session so row-level security (status must be 'pending', owner = caller) applies.
    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        youtube_id: videoId,
        title,
        description: str(body?.description, 5000),
        category,
        tags,
        channel_title: str(body?.channelTitle, 200),
        thumbnail_url: THUMB.test(thumb) ? thumb : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: str(body?.duration, 30),
        status: 'pending',
        submitted_by: user.id,
      })
      .select('id, youtube_id, title, status, created_at')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This video has already been submitted' }, { status: 409 });
      console.error('videos/submit failed:', error.message);
      return NextResponse.json({ error: 'Could not submit the video' }, { status: 500 });
    }

    return NextResponse.json({ success: true, video });
  } catch (err) {
    console.error('videos/submit failed:', err);
    return NextResponse.json({ error: 'Could not submit the video' }, { status: 500 });
  }
}
