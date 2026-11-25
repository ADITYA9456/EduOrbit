# Security incident response

A short runbook for a small team. It is a draft for you to adapt and rehearse, not a certified procedure. Fill the placeholders before an incident, not during one.

**Incident owner:** [NAME, TO BE FILLED]  **Backup:** [NAME, TO BE FILLED]  **Security contact:** [EMAIL, TO BE FILLED]  **Legal adviser:** [TO BE FILLED]

## 1. What counts as an incident

Any suspected unauthorised access to user data or to the database, an exposed or leaked secret, an admin account misused, code escaping the judge sandbox, a defaced or hijacked site, a vulnerable dependency being actively exploited, mass abuse (spam, SMS pumping, AI cost spike), or a report from an outside researcher.

## 2. Severity and first response targets (proposed)

| Level | Examples | Start containing within |
|---|---|---|
| Critical | Service role key or DB credentials leaked, data of users exposed, remote code execution, judge host compromised | 1 hour |
| High | Admin account compromised, answer keys or hidden tests exposed, auth bypass | 4 hours |
| Medium | Abuse of one endpoint, a confirmed vulnerability not yet exploited | 1 working day |
| Low | Hardening reports, no exposure | Next sprint |

## 3. First hour: contain

Write down the time you noticed it and keep a running log (who did what, when). Do not delete evidence.

| Situation | Action |
|---|---|
| Secret leaked (Supabase service role, YouTube, Gemini, Judge0 token, sync secret) | Rotate it at the provider first (Supabase Project Settings > API, Google Cloud Console, `AUTHN_TOKEN` in `judge0.conf`, the `LEETCODE_SYNC_SECRET` env var), update Vercel environment variables, redeploy. Then check for misuse in provider logs. Rotating the Supabase service role key invalidates old ones, follow Supabase's current documentation for the exact steps |
| Account abused or compromised | Ban it from the Admin page (the ban is recorded in `admin_audit_log` once migration 005 is applied). For a compromised admin, remove the role with the service role key or SQL, and reset its password |
| Judge abuse or sandbox escape | Unset `JUDGE0_URL` in Vercel and redeploy: the UI shows "judge not configured" and no code runs. Stop the Judge0 containers. Treat the host as compromised: rebuild it, do not clean it |
| AI cost spike | Set `AI_PROVIDER=mock` and remove or rotate `GEMINI_API_KEY` |
| Bad deployment | Vercel dashboard, promote the previous deployment |
| Data exposure through a database policy | Apply the rollback or fix migration, never disable RLS as a quick fix |
| Bot traffic | Vercel firewall rules, Supabase Auth rate limits and CAPTCHA |

## 4. Investigate

Evidence sources, in order of usefulness: Vercel function logs and request logs (export them early, retention is short), Supabase Dashboard Logs (API, Auth, Postgres), `admin_audit_log` (admin actions), `judge_submissions`, `ai_usage`, GitHub audit log and commit history.

Useful queries (Supabase SQL editor, read-only):

```sql
-- Admin actions in the last 7 days (needs migration 005)
SELECT created_at, actor_id, action, target_type, target_id, details
FROM public.admin_audit_log WHERE created_at > now() - interval '7 days' ORDER BY created_at DESC;

-- Accounts with elevated role or banned
SELECT id, username, role, banned FROM public.profiles WHERE role <> 'user' OR banned;

-- Heaviest judge users in the last day
SELECT user_id, count(*) FROM public.judge_submissions
WHERE created_at > now() - interval '1 day' GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
```

Decide: what data, which users, what time window, how it happened, whether it is still happening.

## 5. Notify (with a lawyer where possible)

Statutory points below are my understanding and must be confirmed. Do not delay containment while deciding.

- **CERT-In:** the 28 April 2022 Directions require reporting listed incident types within 6 hours of noticing them, to incident@cert-in.org.in. Confirm applicability and the current reporting form.
- **DPDP Act:** from 13 May 2027 a personal data breach must be reported to the Data Protection Board and to each affected user, with a detailed report to the Board within 72 hours (Rule 7). Not yet in force today, but build the habit now.
- **Users:** say what happened, what data, what you did, what they should do (for example change passwords). Plain words, no blame, no minimising.
- **Providers:** tell Supabase, Vercel or Google support if their platform or keys are involved.
- **Researchers:** reply within two working days, thank them, keep them updated (`SECURITY.md`).

## 6. Recover

Fix the cause (code, policy, config), restore from backup if data was damaged (`docs/DEPLOYMENT.md` section 5), rotate anything that might have been seen, re-run `scripts/test-sql.mjs` and `scripts/test-api-security.mjs`, deploy, and watch the logs for several days.

## 7. After

Within a week, write a short blameless review: timeline, cause, what worked, what did not, what changes. Add a test that would have caught it. Update `SECURITY_AUDIT.md` and this file. Keep the log and evidence for as long as your lawyer advises.

## 8. Prepare now

Turn on two-factor authentication for GitHub, Vercel, Supabase, Google Cloud and your email. Enable GitHub secret scanning with push protection. Decide where logs are exported and for how long. Write the contacts above. Practise the "unset `JUDGE0_URL`" and "promote previous deployment" steps once.
