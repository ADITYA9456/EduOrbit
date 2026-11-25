import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/bookmarks — get user's bookmarks
export async function GET() {
  try {
    const { supabase } = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select('*, coding_problems(id, title, slug, category, difficulty, tags, type, points)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/bookmarks failed:', error.message);
      return NextResponse.json({ error: 'Could not load bookmarks' }, { status: 500 });
    }

    return NextResponse.json({ bookmarks: bookmarks || [] });
  } catch (err) {
    console.error('GET /api/bookmarks failed:', err);
    return NextResponse.json({ error: 'Could not load bookmarks' }, { status: 500 });
  }
}

// POST /api/bookmarks — toggle bookmark
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
    const questionId = body?.questionId;

    if (typeof questionId !== 'string' || !UUID.test(questionId)) {
      return NextResponse.json({ error: 'A valid questionId is required' }, { status: 400 });
    }

    // Check if already bookmarked (RLS limits every query here to the caller's own rows)
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id).eq('user_id', user.id);
      if (error) {
        console.error('bookmark delete failed:', error.message);
        return NextResponse.json({ error: 'Could not update the bookmark' }, { status: 500 });
      }
      return NextResponse.json({ bookmarked: false });
    }

    const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, question_id: questionId });
    if (error) {
      console.error('bookmark insert failed:', error.message);
      return NextResponse.json({ error: 'Could not update the bookmark' }, { status: 500 });
    }
    return NextResponse.json({ bookmarked: true });
  } catch (err) {
    console.error('POST /api/bookmarks failed:', err);
    return NextResponse.json({ error: 'Could not update the bookmark' }, { status: 500 });
  }
}
