/* eslint-disable no-console */

// Quick diagnostics: checks if key Supabase tables exist + row counts.
// Safe: does NOT print any secrets.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function countTable(supabase, table) {
  // NOTE: Some PostgREST/Supabase setups don't reliably return `count` with HEAD.
  // Using a tiny range request makes count more consistent while keeping payload small.
  const { data, count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact' })
    .range(0, 0);

  return {
    table,
    exists: Array.isArray(data) ? true : null,
    count: typeof count === 'number' ? count : null,
    error: error?.message || null,
  };
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !anonKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exitCode = 1;
    return;
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const supabaseAnon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tables = ['coding_problems', 'questions', 'profiles', 'videos'];

  console.log('Supabase table diagnostics');
  console.log('(admin = service role; anon = what the browser can see with RLS)');

  for (const t of tables) {
    const admin = await countTable(supabaseAdmin, t);
    const anon = await countTable(supabaseAnon, t);

    const adminStr = admin.error
      ? `ERROR: ${admin.error}`
      : `exists=${admin.exists} count=${admin.count}`;
    const anonStr = anon.error
      ? `ERROR: ${anon.error}`
      : `exists=${anon.exists} count=${anon.count}`;

    console.log(`- ${t}: admin(${adminStr}) | anon(${anonStr})`);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err?.message || err);
  process.exitCode = 1;
});
