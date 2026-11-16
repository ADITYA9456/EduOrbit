/* eslint-disable no-console */
// Executes the repo's SQL in an in-memory Postgres (PGlite, WASM) with minimal Supabase stubs
// (auth.uid(), roles) and checks migrations, seeds, RLS, contest locking and ranking.
// Nothing here talks to your Supabase project. PGlite is NOT a project dependency:
//   npm i --no-save @electric-sql/pglite   (or install it in a scratch folder and set PGLITE_DIR)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pgliteDir = process.env.PGLITE_DIR || root;
const { PGlite } = await import(pathToFileURL(createRequire(path.join(pgliteDir, 'x.js')).resolve('@electric-sql/pglite')).href);

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const db = new PGlite();
let failed = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const expectError = async (name, sql, pattern) => {
  try {
    await db.exec(sql);
    check(name, false, 'expected an error');
  } catch (e) {
    check(name, pattern.test(e.message), e.message.split('\n')[0].slice(0, 90));
  }
};
const asUser = async (uid, role = 'authenticated') => {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${uid ?? ''}', false); SET ROLE ${role};`);
};
const asAdminDb = () => db.exec('RESET ROLE;');

// ---- Supabase stubs
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, phone text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT CASE WHEN auth.uid() IS NULL THEN 'anon' ELSE 'authenticated' END $$;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  CREATE PUBLICATION supabase_realtime;
`);

try {
  await db.exec(read('database-schema.sql'));
  check('existing database-schema.sql runs', true);
} catch (e) {
  check('existing database-schema.sql runs', false, e.message.slice(0, 200));
  process.exit(1);
}
await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;`);

// ---- migrations (twice, to prove idempotency)
for (const f of ['001_judge_tables.sql', '002_contests_leaderboard.sql', '003_security_hardening.sql']) {
  for (const pass of [1, 2]) {
    try {
      await db.exec(read(`supabase/migrations/${f}`));
      check(`migration ${f} (run ${pass})`, true);
    } catch (e) {
      check(`migration ${f} (run ${pass})`, false, e.message.slice(0, 200));
    }
  }
}
await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;`);

// ---- seeds
for (const f of ['01_questions_batch1.sql', '02_questions_batch2.sql']) {
  for (const pass of [1, 2]) {
    try {
      await db.exec(read(`supabase/seed/${f}`));
      check(`seed ${f} (run ${pass})`, true);
    } catch (e) {
      check(`seed ${f} (run ${pass})`, false, e.message.slice(0, 200));
    }
  }
}
const stats = await q(`SELECT cp.difficulty, count(DISTINCT cp.id)::int AS problems,
    min(t.hidden)::int AS min_hidden, min(t.samples)::int AS min_samples, bool_and(cp.judged) AS all_judged
  FROM coding_problems cp
  JOIN (SELECT problem_id, count(*) FILTER (WHERE NOT is_sample) AS hidden, count(*) FILTER (WHERE is_sample) AS samples
        FROM problem_tests GROUP BY problem_id) t ON t.problem_id = cp.id
  WHERE cp.slug IN (SELECT slug FROM coding_problems WHERE order_index >= 1001 AND order_index <= 1020)
  GROUP BY cp.difficulty ORDER BY 1`);
const total = stats.reduce((n, r) => n + r.problems, 0);
check('20 seeded problems', total === 20, JSON.stringify(stats));
check('every problem has >=5 hidden and >=2 sample tests, judged = true',
  stats.every((r) => r.min_hidden >= 5 && r.min_samples >= 2 && r.all_judged));
const dup = await q(`SELECT count(*)::int AS n FROM problem_tests`);
check('seeds are idempotent (no duplicate tests)', dup[0].n === (await q(`SELECT count(DISTINCT (problem_id, position))::int AS n FROM problem_tests`))[0].n);

await db.exec(read('supabase/seed/03_sample_contest.sql'));
await db.exec(read('supabase/seed/03_sample_contest.sql'));
const sc = await q(`SELECT (SELECT count(*)::int FROM contests WHERE title LIKE 'EDU Orbit Starter%') AS contests,
                           (SELECT count(*)::int FROM contest_problems cp JOIN contests c ON c.id = cp.contest_id WHERE c.title LIKE 'EDU Orbit Starter%') AS problems`);
check('sample contest seeded once with 4 problems', sc[0].contests === 1 && sc[0].problems === 4, JSON.stringify(sc[0]));

// ---- users
const U = {};
for (const name of ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'admin']) {
  const [{ id }] = await q(`INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, $2) RETURNING id`, [`${name}@test.local`, JSON.stringify({ full_name: name })]);
  U[name] = id;
}
check('profiles auto-created by existing trigger', (await q('SELECT count(*)::int n FROM profiles'))[0].n === 7);
await db.exec(`UPDATE profiles SET role = 'admin' WHERE id = '${U.admin}'`);

// ---- RLS: hidden tests are unreadable, samples readable
await asUser(U.u1);
const visible = await q(`SELECT count(*) FILTER (WHERE is_sample)::int AS s, count(*) FILTER (WHERE NOT is_sample)::int AS h FROM problem_tests`);
check('authenticated users see sample tests only', visible[0].s === 40 && visible[0].h === 0, JSON.stringify(visible[0]));
await asUser(null, 'anon');
check('anon sees sample tests only', (await q(`SELECT count(*)::int n FROM problem_tests WHERE NOT is_sample`))[0].n === 0);
await asUser(U.u1);
await expectError('users cannot insert a verdict', `INSERT INTO judge_submissions (user_id, problem_id, kind, language, code, verdict)
  SELECT '${U.u1}', id, 'submit', 'python', 'x', 'accepted' FROM coding_problems LIMIT 1`, /row-level security|violates/i);
await expectError('users cannot insert legacy submissions as accepted', `INSERT INTO submissions (user_id, problem_id, code, status)
  SELECT '${U.u1}', id, 'x', 'accepted' FROM coding_problems LIMIT 1`, /row-level security|violates/i);
await expectError('users cannot edit their own role', `UPDATE profiles SET role = 'admin' WHERE id = '${U.u1}'`, /protected_profile_column/);
await expectError('users cannot edit their own points', `UPDATE profiles SET total_points = 99999 WHERE id = '${U.u1}'`, /protected_profile_column/);
await db.exec(`UPDATE profiles SET bio = 'hello' WHERE id = '${U.u1}'`);
check('users can still edit bio', (await q(`SELECT bio FROM profiles WHERE id = '${U.u1}'`))[0].bio === 'hello');
const edited = await db.query(`UPDATE coding_problems SET title = 'hacked'`);
check('non-admins cannot edit problems', edited.affectedRows === 0);
const lbWrite = await db.query(`UPDATE leaderboard_entries SET score = 9999`);
check('non-admins cannot edit legacy leaderboard rows', lbWrite.affectedRows === 0);
await asUser(U.admin);
const adminEdit = await db.query(`UPDATE coding_problems SET title = title WHERE slug = 'two-sum-indices'`);
check('admins can edit problems', adminEdit.affectedRows === 1);
await db.exec(`UPDATE profiles SET banned = false WHERE id = '${U.u2}'`);
check('admins can update other profiles', true);

// drafts are private
await asUser(U.u1);
await db.exec(`INSERT INTO judge_drafts (user_id, problem_id, language, code) SELECT '${U.u1}', id, 'python', 'print(1)' FROM coding_problems LIMIT 1`);
await asUser(U.u2);
check("users cannot read others' drafts", (await q('SELECT count(*)::int n FROM judge_drafts'))[0].n === 0);
await expectError("users cannot write drafts as someone else", `INSERT INTO judge_drafts (user_id, problem_id, language, code) SELECT '${U.u1}', id, 'c', 'x' FROM coding_problems LIMIT 1`, /row-level security/i);

// ---- contest locking via trigger (live contest = the seeded one)
await asAdminDb();
const [{ id: live }] = await q(`SELECT id FROM contests WHERE title LIKE 'EDU Orbit Starter%'`);
const [pA, pB, pC] = (await q(`SELECT problem_id FROM contest_problems WHERE contest_id = '${live}' ORDER BY order_index LIMIT 3`)).map((r) => r.problem_id);
const [{ id: outsider }] = await q(`SELECT id FROM coding_problems WHERE id NOT IN (SELECT problem_id FROM contest_problems WHERE contest_id = '${live}') LIMIT 1`);
await expectError('submission rejected when user is not registered',
  `INSERT INTO contest_submissions (contest_id, user_id, problem_id, verdict, is_accepted) VALUES ('${live}', '${U.u1}', '${pA}', 'accepted', true)`, /not_registered/);
await db.exec(`INSERT INTO contest_participants (contest_id, user_id) VALUES ('${live}', '${U.u1}')`);
await expectError('submission rejected for a problem outside the contest',
  `INSERT INTO contest_submissions (contest_id, user_id, problem_id, verdict, is_accepted) VALUES ('${live}', '${U.u1}', '${outsider}', 'accepted', true)`, /problem_not_in_contest/);
await db.exec(`INSERT INTO contest_submissions (contest_id, user_id, problem_id, verdict, is_accepted) VALUES ('${live}', '${U.u1}', '${pA}', 'wrong_answer', false)`);
check('submission accepted inside the window', (await q('SELECT count(*)::int n FROM contest_submissions'))[0].n === 1);
await db.exec(`UPDATE contests SET end_time = now() - interval '1 second' WHERE id = '${live}'`);
await expectError('submission rejected after end_time (server lock)',
  `INSERT INTO contest_submissions (contest_id, user_id, problem_id, verdict, is_accepted) VALUES ('${live}', '${U.u1}', '${pA}', 'accepted', true)`, /contest_ended/);
await expectError('registration rejected after end_time',
  `INSERT INTO contest_participants (contest_id, user_id) VALUES ('${live}', '${U.u2}')`, /contest_ended/);
await db.exec(`UPDATE contests SET start_time = now() + interval '1 hour', end_time = now() + interval '2 hours' WHERE id = '${live}'`);
await expectError('submission rejected before start_time',
  `INSERT INTO contest_submissions (contest_id, user_id, problem_id, verdict, is_accepted) VALUES ('${live}', '${U.u1}', '${pA}', 'accepted', true)`, /contest_not_started/);
await db.exec(`DELETE FROM contest_submissions WHERE contest_id = '${live}'`);

// ---- ranking fixture (trigger disabled ONLY to place rows at chosen times; test DB only)
const [{ id: rc }] = await q(`INSERT INTO contests (title, start_time, end_time, wrong_penalty_minutes)
  VALUES ('Ranking fixture', now() - interval '3 hours', now() + interval '1 hour', 10) RETURNING id`);
await db.exec(`INSERT INTO contest_problems (contest_id, problem_id, order_index, points) VALUES
  ('${rc}', '${pA}', 1, 100), ('${rc}', '${pB}', 2, 200), ('${rc}', '${pC}', 3, 300)`);
const base = `(SELECT start_time FROM contests WHERE id = '${rc}')`;
const order = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
for (const [i, n] of order.entries()) {
  await db.exec(`INSERT INTO contest_participants (contest_id, user_id, joined_at) VALUES ('${rc}', '${U[n]}', now() - interval '${60 - i} minutes')`);
}
await db.exec('ALTER TABLE contest_submissions DISABLE TRIGGER trg_contest_submissions_window');
const sub = (user, prob, minutes, ok) => db.exec(`INSERT INTO contest_submissions (contest_id, user_id, problem_id, verdict, is_accepted, created_at)
  VALUES ('${rc}', '${U[user]}', '${prob}', '${ok ? 'accepted' : 'wrong_answer'}', ${ok}, ${base} + interval '${minutes} minutes')`);
await sub('u1', pA, 10, true);            // u1: A@10
await sub('u1', pB, 5, false); await sub('u1', pB, 12, false); await sub('u1', pB, 30, true); // B@30 with 2 wrongs
await sub('u2', pA, 5, true);  await sub('u2', pB, 20, true);   // u2: 300 pts, penalty 25
await sub('u3', pA, 15, false); await sub('u3', pA, 40, true);  // u3: 100 pts, penalty 40 + 10
await sub('u3', pA, 50, true);                                  // later duplicate AC must not matter
await sub('u3', pB, 60, false);                                 // wrong on unsolved problem: no penalty
await sub('u4', pC, 25, false);                                 // u4: only wrong attempts
await sub('u5', pA, 300, true);                                 // u5: accepted AFTER end_time -> ignored
await sub('u6', pC, 90, true);                                  // u6: 300 pts, penalty 90
await db.exec('ALTER TABLE contest_submissions ENABLE TRIGGER trg_contest_submissions_window');

await asUser(U.u5);
const std = await q(`SELECT * FROM contest_standings('${rc}', 25, 0)`);
const names = Object.fromEntries(Object.entries(U).map(([k, v]) => [v, k]));
const rankOf = Object.fromEntries(std.map((r) => [names[r.user_id], Number(r.rank)]));
console.log('   standings:', std.map((r) => `${r.rank}.${names[r.user_id]} ${r.score}pts/${r.penalty_minutes}min`).join('  '));
check('rank 1 = u2 (300 pts, penalty 25)', rankOf.u2 === 1 && Number(std[0].score) === 300 && Number(std[0].penalty_minutes) === 25);
check('rank 2 = u1 (300 pts, penalty 10 + 30 + 2 wrongs x 10 = 60)', rankOf.u1 === 2 && Number(std.find((r) => names[r.user_id] === 'u1').penalty_minutes) === 60);
check('rank 3 = u6 (300 pts, penalty 90)', rankOf.u6 === 3);
check('rank 4 = u3 (100 pts, penalty 40 + 10 wrong = 50)', rankOf.u3 === 4 && Number(std.find((r) => names[r.user_id] === 'u3').penalty_minutes) === 50);
check('zero-score users follow, ordered by registration time (u4 before u5)', rankOf.u4 === 5 && rankOf.u5 === 6);
check('accepted-after-end submission is ignored', Number(std.find((r) => names[r.user_id] === 'u5').score) === 0);
check('total_count is the participant count', Number(std[0].total_count) === 6);
check('is_me marks the caller', std.find((r) => names[r.user_id] === 'u5').is_me === true && std.filter((r) => r.is_me).length === 1);
const page2 = await q(`SELECT * FROM contest_standings('${rc}', 2, 2)`);
check('pagination: limit 2 offset 2 -> ranks 3,4', page2.length === 2 && Number(page2[0].rank) === 3 && Number(page2[1].rank) === 4);
const mine = await q(`SELECT * FROM contest_my_standing('${rc}')`);
check("caller's own rank is available off-page (u5 = 6)", mine.length === 1 && Number(mine[0].rank) === 6);
await asUser(null, 'anon');
check('anon can read standings but has no own row', (await q(`SELECT * FROM contest_standings('${rc}', 25, 0)`)).length === 6 && (await q(`SELECT * FROM contest_my_standing('${rc}')`)).length === 0);
await expectError('internal ranking helper is not callable by clients', `SELECT * FROM _contest_ranked('${rc}')`, /permission denied/i);

// ---- global leaderboard
await asAdminDb();
const subJ = (user, prob, tsExpr, verdict = 'accepted', kind = 'submit') => db.exec(`INSERT INTO judge_submissions (user_id, problem_id, kind, language, code, verdict, created_at)
  VALUES ('${U[user]}', '${prob}', '${kind}', 'python', 'x', '${verdict}', ${tsExpr})`);
const probs = await q(`SELECT id, points FROM coding_problems WHERE order_index BETWEEN 1001 AND 1020 ORDER BY order_index LIMIT 4`);
const [g1, g2, g3, g4] = probs.map((p) => p.id);
const pts = probs.map((p) => Number(p.points));
await subJ('u1', g1, `now() - interval '5 hours'`); await subJ('u1', g1, `now() - interval '4 hours'`); // duplicate AC counts once
await subJ('u1', g2, `now() - interval '3 hours'`);
await subJ('u2', g1, `now() - interval '2 hours'`); await subJ('u2', g2, `now() - interval '1 hour'`); // same tally as u1, later -> ranks below
await subJ('u3', g3, `now() - interval '1 hour'`);
await subJ('u4', g4, `now() - interval '1 hour'`, 'wrong_answer');           // not accepted
await subJ('u5', g4, `now() - interval '1 hour'`, 'accepted', 'run');         // a Run never counts
await db.exec(`UPDATE profiles SET banned = true WHERE id = '${U.u6}'`);
await subJ('u6', g1, `now() - interval '9 hours'`);                           // banned: hidden
await asUser(U.u2);
const gl = await q(`SELECT * FROM global_leaderboard(25, 0)`);
console.log('   global:', gl.map((r) => `${r.rank}.${names[r.user_id]} ${r.points}pts/${r.solved}`).join('  '));
check('global: u1 first (earlier to reach same points as u2)', names[gl[0].user_id] === 'u1' && Number(gl[0].points) === pts[0] + pts[1] && Number(gl[0].solved) === 2);
check('global: duplicate accepted submissions count once', Number(gl[0].solved) === 2);
check('global: u2 second with the same tally', names[gl[1].user_id] === 'u2' && Number(gl[1].points) === pts[0] + pts[1]);
check('global: only accepted submits are ranked (u3 third; u4, u5, banned u6 absent)',
  gl.length === 3 && names[gl[2].user_id] === 'u3');
const gme = await q(`SELECT * FROM global_my_rank()`);
check("global: caller's own rank (u2 = 2)", gme.length === 1 && Number(gme[0].rank) === 2);
check('global: pagination offset past the end returns no rows', (await q(`SELECT * FROM global_leaderboard(25, 100)`)).length === 0);

console.log(failed === 0 ? '\nAll SQL checks passed.' : `\n${failed} SQL check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
