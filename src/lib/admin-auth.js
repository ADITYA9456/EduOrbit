import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Server-side admin gate for /api/admin/*. Never trust the client's idea of "isAdmin".
// Returns { user, admin } on success or { response } to return immediately.
export async function requireAdmin() {
  const { supabase, supabaseAdmin } = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabaseAdmin.from('profiles').select('role, banned').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' || profile?.banned) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, admin: supabaseAdmin };
}
