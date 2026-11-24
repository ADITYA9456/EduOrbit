import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { LANGUAGES, LIMITS, getJudgeConfig } from './config';
import { JudgeError } from './judge0';
import { rateLimit } from '@/lib/memory-cache';
import { judgeTests, runCustom } from './run';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const byteLength = (s) => Buffer.byteLength(s, 'utf8');

// Best-effort guard against double clicks inside one server instance.
// The database rate limit below is what holds across instances.
const inFlight = new Set();

const fail = (status, error, message, extra = {}) =>
  NextResponse.json({ error, message, ...extra }, { status, headers: extra.retryAfter ? { 'Retry-After': String(extra.retryAfter) } : undefined });

function validate(body, kind) {
  if (!body || typeof body !== 'object') return 'Request body must be JSON';
  if (typeof body.problemId !== 'string' || !UUID.test(body.problemId)) return 'problemId must be a valid id';
  if (typeof body.language !== 'string' || !Object.prototype.hasOwnProperty.call(LANGUAGES, body.language)) {
    return 'Unsupported language';
  }
  if (typeof body.code !== 'string' || body.code.trim().length === 0) return 'code is required';
  if (byteLength(body.code) > LIMITS.maxCodeBytes) return `code must be at most ${LIMITS.maxCodeBytes / 1024} KB`;
  if (body.customInput != null) {
    if (typeof body.customInput !== 'string') return 'customInput must be a string';
    if (byteLength(body.customInput) > LIMITS.maxStdinBytes) return 'customInput is too large';
    if (kind !== 'run') return 'customInput is only valid for run';
  }
  if (body.contestId != null) {
    if (kind !== 'submit') return 'contestId is only valid for submit';
    if (typeof body.contestId !== 'string' || !UUID.test(body.contestId)) return 'contestId must be a valid id';
  }
  return null;
}

async function checkContest(admin, contestId, problemId, userId) {
  const { data: contest } = await admin
    .from('contests')
    .select('id, start_time, end_time')
    .eq('id', contestId)
    .maybeSingle();
  if (!contest) return fail(404, 'contest_not_found', 'Contest not found');
  const now = Date.now();
  if (now < new Date(contest.start_time).getTime()) return fail(403, 'contest_not_started', 'This contest has not started');
  if (now > new Date(contest.end_time).getTime()) return fail(403, 'contest_ended', 'This contest has ended');

  const [{ data: cp }, { data: part }] = await Promise.all([
    admin.from('contest_problems').select('id').eq('contest_id', contestId).eq('problem_id', problemId).maybeSingle(),
    admin.from('contest_participants').select('id').eq('contest_id', contestId).eq('user_id', userId).maybeSingle(),
  ]);
  if (!cp) return fail(400, 'problem_not_in_contest', 'This problem is not part of the contest');
  if (!part) return fail(403, 'not_registered', 'Register for the contest before submitting');
  return null;
}

async function awardFirstSolve(admin, userId, problem) {
  const { data: profile } = await admin
    .from('profiles')
    .select('total_points, problems_solved, badges')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return 0;

  const points = problem.points || 10;
  const solved = (profile.problems_solved || 0) + 1;
  const badges = new Set(profile.badges || []);
  [[1, 'first_solve'], [10, 'problems_10'], [50, 'problems_50'], [100, 'problems_100']].forEach(([n, id]) => {
    if (solved >= n) badges.add(id);
  });

  await admin
    .from('profiles')
    .update({ total_points: (profile.total_points || 0) + points, problems_solved: solved, badges: [...badges] })
    .eq('id', userId);

  await admin.from('user_progress').upsert(
    { user_id: userId, question_id: problem.id, status: 'solved', score: points, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,question_id' }
  );
  return points;
}

export async function handleJudgeRequest(request, kind) {
  let userId = null;
  try {
    const { supabase, supabaseAdmin: admin } = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return fail(401, 'unauthorized', 'Sign in to run code');
    userId = user.id;

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, 'invalid_request', 'Request body must be JSON');
    }
    const invalid = validate(body, kind);
    if (invalid) return fail(400, 'invalid_request', invalid);

    const { data: account } = await admin.from('profiles').select('banned').eq('id', user.id).maybeSingle();
    if (account?.banned) return fail(403, 'banned', 'This account has been suspended.');
    const { data: tzRow } = await admin.from('profiles').select('timezone').eq('id', user.id).maybeSingle();

    if (!getJudgeConfig().configured) {
      return fail(503, 'judge_not_configured', 'The code judge is not configured on this deployment.');
    }

    // Rate limit, measured from the database so it holds across serverless instances.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: recent, error: recentError } = await admin
      .from('judge_submissions')
      .select('kind')
      .eq('user_id', user.id)
      .gte('created_at', since);
    if (recentError) return fail(500, 'internal_error', 'Could not check rate limit');
    const submits = recent.filter((r) => r.kind === 'submit').length;
    if (recent.length >= LIMITS.requestsPerMinute || (kind === 'submit' && submits >= LIMITS.submitsPerMinute)) {
      return fail(429, 'rate_limited', 'Too many runs. Wait a moment and try again.', { retryAfter: 15 });
    }

    if (inFlight.has(user.id)) return fail(409, 'in_progress', 'Your previous run is still in progress');

    const { data: problem } = await admin
      .from('coding_problems')
      .select('id, title, type, points, time_limit_ms, memory_limit_kb, judged')
      .eq('id', body.problemId)
      .maybeSingle();
    if (!problem) return fail(404, 'problem_not_found', 'Problem not found');
    if (problem.type !== 'code' || !problem.judged) {
      return fail(409, 'problem_not_judged', 'This problem does not have judge tests yet');
    }

    if (kind === 'submit' && body.contestId) {
      const blocked = await checkContest(admin, body.contestId, problem.id, user.id);
      if (blocked) return blocked;
    }

    inFlight.add(user.id);
    try {
      // Console run with custom stdin: output only, nothing stored or scored.
      if (kind === 'run' && typeof body.customInput === 'string') {
        // Custom runs are not stored, so the database limit above cannot see them.
        const custom = rateLimit(`judge-custom:${user.id}`, LIMITS.requestsPerMinute, 60_000);
        if (!custom.ok) return fail(429, 'rate_limited', 'Too many runs. Wait a moment and try again.', { retryAfter: custom.retryAfter });
        const out = await runCustom({ problem, language: body.language, code: body.code, stdin: body.customInput });
        return NextResponse.json({ mode: 'custom', ...out });
      }

      let query = admin
        .from('problem_tests')
        .select('position, is_sample, input, expected_output')
        .eq('problem_id', problem.id)
        .order('position', { ascending: true })
        .limit(LIMITS.maxTests);
      if (kind === 'run') query = query.eq('is_sample', true);
      const { data: tests, error: testsError } = await query;
      if (testsError) return fail(500, 'internal_error', 'Could not load tests');
      if (!tests || tests.length === 0) return fail(409, 'problem_not_judged', 'This problem does not have judge tests yet');

      const outcome = await judgeTests({ problem, language: body.language, code: body.code, tests });

      if (kind === 'submit') {
        // Any submission counts as activity for the streak. Missing before migration 004: ignore the error.
        const { error: streakError } = await admin.rpc('_record_activity', {
          p_user: user.id,
          p_type: 'solve',
          p_tz: tzRow?.timezone || 'UTC',
        });
        if (streakError && !/_record_activity/.test(streakError.message)) console.error('record activity failed:', streakError.message);
      }

      let pointsEarned = 0;
      if (kind === 'submit' && outcome.verdict === 'accepted') {
        const { count } = await admin
          .from('judge_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('problem_id', problem.id)
          .eq('kind', 'submit')
          .eq('verdict', 'accepted');
        if (count === 0) pointsEarned = await awardFirstSolve(admin, user.id, problem);
      }

      const { data: saved, error: saveError } = await admin
        .from('judge_submissions')
        .insert({
          user_id: user.id,
          problem_id: problem.id,
          contest_id: kind === 'submit' ? body.contestId || null : null,
          kind,
          language: body.language,
          code: body.code,
          verdict: outcome.verdict,
          passed_count: outcome.passed,
          total_count: outcome.total,
          runtime_ms: outcome.runtimeMs,
          memory_kb: outcome.memoryKb,
          compile_output: outcome.compileOutput || null,
          results: outcome.results,
          points_earned: pointsEarned,
        })
        .select('id, created_at')
        .single();
      if (saveError) console.error('judge_submissions insert failed:', saveError.message);

      let contestRecorded = null;
      if (kind === 'submit' && body.contestId && saved) {
        // Compile and internal errors are not counted as attempts.
        if (!['compilation_error', 'internal_error'].includes(outcome.verdict)) {
          const { error: contestError } = await admin.from('contest_submissions').insert({
            contest_id: body.contestId,
            user_id: user.id,
            problem_id: problem.id,
            judge_submission_id: saved.id,
            verdict: outcome.verdict,
            is_accepted: outcome.verdict === 'accepted',
          });
          // The database trigger is the final authority on the contest window.
          if (contestError) {
            const locked = /contest_ended|contest_not_started/.test(contestError.message);
            if (locked) return fail(403, 'contest_ended', 'The contest ended before your submission was judged');
            console.error('contest_submissions insert failed:', contestError.message);
          } else {
            contestRecorded = true;
          }
        }
      }

      return NextResponse.json({
        mode: kind,
        submissionId: saved?.id ?? null,
        verdict: outcome.verdict,
        passed: outcome.passed,
        total: outcome.total,
        runtimeMs: outcome.runtimeMs,
        memoryKb: outcome.memoryKb,
        compileOutput: outcome.compileOutput,
        results: outcome.results,
        pointsEarned,
        contestRecorded,
      });
    } finally {
      inFlight.delete(user.id);
    }
  } catch (err) {
    if (userId) inFlight.delete(userId);
    if (err instanceof JudgeError) {
      if (err.code === 'timeout') return fail(504, 'judge_timeout', 'The judge took too long to respond. Try again.');
      if (err.code === 'not_configured') return fail(503, 'judge_not_configured', 'The code judge is not configured on this deployment.');
      console.error('Judge unavailable:', err.message);
      return fail(502, 'judge_unavailable', 'The code judge is unavailable right now. Try again shortly.');
    }
    console.error('Judge route error:', err);
    return fail(500, 'internal_error', 'Something went wrong while judging your code');
  }
}
