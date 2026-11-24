import { createServerSupabase } from '@/lib/supabase/server';
import { clientIp, rateLimit } from '@/lib/memory-cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');

export async function POST(request) {
  try {
    const limit = rateLimit(`contact:${clientIp(request)}`, 5, 60 * 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Hidden field: real people never fill it in.
    if (str(body?.website)) return NextResponse.json({ ok: true });

    const name = str(body?.name);
    const email = str(body?.email);
    const subject = str(body?.subject);
    const message = str(body?.message);

    const errors = {};
    if (!name || name.length > 100) errors.name = 'Enter your name (up to 100 characters)';
    if (!EMAIL.test(email) || email.length > 200) errors.email = 'Enter a valid email address';
    if (!subject || subject.length > 150) errors.subject = 'Enter a subject (up to 150 characters)';
    if (message.length < 10 || message.length > 4000) errors.message = 'Write between 10 and 4000 characters';
    if (Object.keys(errors).length) {
      return NextResponse.json({ error: 'Please fix the highlighted fields', fields: errors }, { status: 400 });
    }

    const { supabase, supabaseAdmin } = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabaseAdmin
      .from('contact_messages')
      .insert({ user_id: user?.id ?? null, name, email, subject, message });
    if (error) {
      console.error('contact insert failed:', error.message);
      return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('contact failed:', err);
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }
}
