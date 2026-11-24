/* eslint-disable no-console */
// Grants the admin role to an existing account by email. Uses the service role key from .env.local.
//   node scripts/make-admin.mjs you@example.com
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createClient } = createRequire(path.join(root, 'x.js'))('@supabase/supabase-js');
for (const l of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const email = (process.argv[2] || '').toLowerCase();
if (!email) { console.error('Usage: node scripts/make-admin.mjs <email>'); process.exit(1); }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let user = null;
for (let page = 1; page < 20 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) { console.error(error.message); process.exit(1); }
  user = data.users.find((u) => (u.email || '').toLowerCase() === email);
  if (data.users.length < 100) break;
}
if (!user) { console.error(`No account with ${email} yet. Sign up or sign in with it once, then re-run.`); process.exit(2); }
const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
if (error) { console.error(error.message); process.exit(1); }
console.log(`${email} is now an admin.`);
