import { logAdminAction } from '@/lib/audit';
import { rateLimit } from '@/lib/memory-cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/account/delete { confirm: "DELETE" }: permanently deletes the signed-in user's account.
// Deleting the auth user cascades to the profile and everything keyed to it (submissions, drafts, progress,
// bookmarks, study data, contest rows). Videos and reports they filed stay but lose the link to them.
export async function POST(request) {
  try {
    const { supabase, supabaseAdmin: admin } = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = rateLimit(`account-delete:${user.id}`, 3, 60 * 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (body?.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });
    }

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role === 'admin') {
      return NextResponse.json({ error: 'Admin accounts cannot be deleted here. Ask another admin to remove the role first.' }, { status: 403 });
    }

    // Free-text messages carry the person's name and email, so they go too (their user link would only be nulled).
    const { error: msgError } = await admin.from('contact_messages').delete().eq('user_id', user.id);
    if (msgError && !/does not exist|schema cache/i.test(msgError.message)) {
      console.error('account delete: contact messages failed:', msgError.message);
      return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 });
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('account delete failed:', error.message);
      return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 });
    }

    // Security record only: the id of a deleted account, no personal details.
    await logAdminAction(admin, null, 'account.self_delete', 'user', user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('account delete failed:', err);
    return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 });
  }
}
