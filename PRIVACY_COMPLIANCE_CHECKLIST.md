# Privacy and compliance readiness (India)

**This is a technical readiness assessment, not legal advice, and code changes do not make a business compliant.** Each row says who has to act: **Code** (done or doable in this repository), **Docs** (a written policy), **Process** (something you must operate), **Provider** (a setting at Supabase, Vercel, Google and so on), **Lawyer** (needs professional review). Nothing here is a claim of compliance. Statutory details below are my understanding as of 25 November 2026 and must be confirmed against the current text.

## 1. Personal data inventory (from the code and migrations)

| Data | Where | Purpose | Visible to others? | Retention today |
|---|---|---|---|---|
| Email, password hash, phone number, Google identity | Supabase `auth.users` | Sign-in | No | Until the account is deleted |
| Username, display name, avatar URL (Google picture), bio | `profiles` | Profile, leaderboards | Name, username, avatar and points appear on leaderboards and contest standings. Profile rows are no longer publicly readable after migration 005 | Until deletion |
| Points, solved count, badges, streak, timezone | `profiles`, `streaks` | Gamification | Points and solved count on leaderboards | Until deletion |
| Submitted code, verdicts, drafts | `judge_submissions`, `judge_drafts` | Grading, history | Own only | Until deletion. No automatic expiry |
| Bookmarks, progress, study sessions, goals, planner | several tables | Product features | Own only | Until deletion |
| Contest registrations and submissions | `contest_participants`, `contest_submissions` | Contests | Rank and score public | Until deletion |
| Videos submitted, reports filed | `videos`, `reports` | Moderation | Approved videos public | Kept without the link to the user after deletion |
| Contact messages (name, email, subject, message) | `contact_messages` | Support | Admins | Until handled, then indefinitely. Now deleted with the account, and removable by an admin |
| AI usage counters, AI verification logs | `ai_usage`, `ai_verification_logs` | Rate limiting, moderation | Admins | Indefinite |
| Admin audit log | `admin_audit_log` (after 005) | Security record | Admins | Indefinite. Holds ids, not personal text |
| Technical logs (IP, request details) | Vercel and Supabase | Operations, security | No | Set by the providers |

Third parties that receive data: Supabase (storage and auth), Vercel (hosting), Google (Gemini receives video title and description or the learner's chat question and progress summary when AI is enabled; YouTube embeds and APIs; Google sign-in), the Judge0 host (submitted code), SMS provider for phone OTP (phone number). Several of these process data outside India.

## 2. Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025

**Timeline (confirm with counsel).** The Act and Rules were notified on 13 November 2025 (G.S.R. 843(E), 846(E)). Board-related provisions took effect at publication. Consent Manager registration (Rule 4) took effect one year later, 13 November 2026. **The duties that bind an ordinary service (notice, consent, security safeguards, breach reporting, retention and erasure, children's data, data principal rights) start eighteen months after publication, on 13 May 2027** (some commentators count from 14 November 2025). So today most of these are preparation, not yet enforceable. Until then existing law, including Section 43A of the IT Act, still applies. EduOrbit is run by an individual in India, who would be the Data Fiduciary.

| Topic | State in this repository | Owner | Status |
|---|---|---|---|
| Notice (what, why, rights, how to complain) | `/privacy` exists and lists data, purposes, processors and rights. It has no named grievance contact, no list of retention periods, and does not mention the Data Protection Board complaint route | Docs, Lawyer | Needs improvement before 13 May 2027 |
| Consent (free, specific, withdrawable) | Sign-up shows a notice linking Terms and Privacy (added). There is no consent record (who accepted which version, when), no separate consent for AI processing by Google | Code, Docs, Lawyer | NOT DONE. The right design (checkbox, versioned record, or reliance on a "legitimate use") is a legal decision |
| Withdrawal of consent | Contact page only. Deleting the account is now self-service | Code, Process | Partly done |
| Access and correction | Profile edit and self-service JSON export (`/api/account/export`, added) | Code | Done in code, flows NOT TESTED with a real account |
| Erasure | Self-service delete (`/api/account/delete`, added). Cascades to the profile and linked data, deletes contact messages, keeps videos and reports unlinked. Admin accounts cannot self-delete | Code | Done in code, NOT TESTED. Backups at Supabase keep copies until they roll over, which should be stated in the policy |
| Retention schedule | No automatic deletion anywhere. No policy for inactive accounts, old submissions, AI logs or contact messages. Rule 8 also sets minimum log retention (I understand one year for certain logs) | Docs, Process, Code | NOT DONE |
| Purpose limitation and minimisation | Reasonable. Phone number is no longer copied into the public profile (migration 004). The study assistant receives progress summaries, not names or emails | Code | Present |
| Security safeguards | Encryption in transit (HTTPS, HSTS), RLS isolation, server-only secrets, audit log (005). Gaps: no MFA for admins, no monitoring or alerting, rate limits per instance (R-03, R-04, R-11) | Code, Provider, Process | Partly present |
| Breach response | `SECURITY_INCIDENT_RESPONSE.md` added. Reporting to the Board and to affected users (a detailed report within 72 hours under Rule 7, as I understand it) must be a rehearsed process | Process, Lawyer | Draft only |
| Children | The Act defines a child as under 18 and requires verifiable parental consent for processing a child's data (Rule 10), with limited exemptions (Rule 12). **The Privacy Policy says EduOrbit is "not directed at children under 13" and the Terms allow minors "with a parent or guardian's permission". Nothing verifies age or consent.** A coding-practice and learning site will attract school students | Lawyer, Code, Docs | NOT DONE. Highest-priority compliance question. Decide: adults only (age declaration, block), or build parental consent, or confirm an exemption applies. Also the tracking and behavioural-monitoring restriction for children's data |
| Data processor contracts | Supabase, Vercel, Google, SMS provider and Judge0 host process data for you | Process, Lawyer | Check each provider's data processing terms and whether you need a signed DPA |
| Cross-border transfer | Providers process abroad. The Act allows it unless a country is restricted by notification | Lawyer | Monitor |
| Contact for questions (Rule 9) | Only the contact form | Docs | Needs a published contact (see section 5) |
| Significant Data Fiduciary duties | Not expected at this scale | Lawyer | Not applicable unless notified |
| Consent Manager | Not used | n/a | NOT APPLICABLE |

## 3. CERT-In Directions of 28 April 2022

My understanding of the directions (confirm applicability and detail with counsel): service providers, intermediaries, body corporates and others must report listed cyber security incidents to CERT-In within 6 hours of noticing them, keep logs of ICT systems for a rolling 180 days within Indian jurisdiction, synchronise system clocks with NIC or NPL NTP servers, and designate a point of contact. Applicability to a small hosted web app depends on whether it counts as an intermediary or body corporate, which is likely but is a question for counsel.

| Requirement | State | Owner | Status |
|---|---|---|---|
| Incident identification and 6-hour reporting | Procedure drafted in `SECURITY_INCIDENT_RESPONSE.md`. No detection (no alerting or monitoring) | Process | NOT DONE (detection) |
| 180-day log retention in India | Vercel and Supabase logs are held by the providers, with retention that is shorter on many plans and not necessarily in India. App-level logs (`console.error`) go to Vercel. `admin_audit_log` is retained but is not an access log | Provider, Process | NOT VERIFIED, likely a gap |
| Time synchronisation | Providers' infrastructure. Judge0 host is yours | Provider, Process | Check the Judge0 server |
| Point of contact | None named | Docs, Process | NOT DONE |
| Vendor and infrastructure responsibilities | Mostly Vercel, Supabase and the Judge0 host | Provider | Review contracts |

## 4. IT Act, 2000 and the IT (Intermediary Guidelines) Rules, 2021

EduOrbit hosts user-provided material: usernames and bios, video recommendations (links, not hosted video), contact messages, and submitted code that only its author sees. It is probably an intermediary for at least part of this. Whether it benefits from safe harbour under Section 79 depends on following due diligence rules. For counsel to confirm.

| Item | State | Owner | Status |
|---|---|---|---|
| Published rules, privacy policy and user agreement | `/terms` and `/privacy` exist (Terms section 4 works as an acceptable-use list) | Docs | Present |
| Telling users not to host prohibited content | Terms section 4 covers it in general terms | Docs, Lawyer | Present, review wording against the Rules |
| Grievance Officer with name and contact, acknowledgement and resolution timelines | Only a contact form. No named officer, no stated timelines | Docs, Process, Lawyer | NOT DONE, needs real details |
| Moderation | Admin approval of videos, report button, 10-report auto-unpublish (now working, F-05), ban tooling, audit trail (005) | Code, Process | Present, now logged |
| Takedown on lawful orders and notices | No documented process | Process | NOT DONE |
| Copyright complaints | No copyright and takedown policy | Docs | NOT DONE |

## 5. Intellectual property and content

| Item | Concern | Owner |
|---|---|---|
| YouTube embeds and Data API | Allowed within YouTube's API and embedding terms. Do not download, re-host or strip branding. Piped and Invidious mirrors are unofficial front-ends, so their use is questionable (R-09) | Lawyer |
| User-submitted videos | Users recommend videos they do not own. The platform only embeds them, but a copyright and takedown policy is needed | Docs |
| LeetCode sync | Pulls problem titles, difficulty and tags from LeetCode's GraphQL endpoint with a custom user agent. This may breach LeetCode's terms. Only metadata is stored, not statements, but ask before relying on it | Lawyer |
| Question bank | Seed problems are generated in `scripts/questions/*`. Confirm originality and that none is copied from a third party. User-written code is licensed to you under Terms section 5 | Lawyer |
| AI-generated content | Hints and assistant replies are generated by Gemini. The Terms warn they may be wrong. Provider terms govern output and data use | Docs |

## 6. Payments and consumer protection

NOT APPLICABLE: there are no paid features, payment gateway or subscriptions in this repository. If you add them later, a refund and cancellation policy, price transparency, grievance handling and tax invoicing, and server-side payment verification become required.

## 7. Legal documents inventory

| Document | Exists? | Needs |
|---|---|---|
| Privacy Policy | Yes, `/privacy`, updated 25 Nov 2026 in this audit for the new self-service rights | Lawyer review, retention periods, grievance contact, children's position |
| Terms and Conditions | Yes, `/terms` | Lawyer review, align with the children's decision |
| Cookie notice | Covered in Privacy section 5: only essential cookies and local storage, no advertising or cross-site tracking. A banner is probably not needed on that basis, confirm with counsel | Lawyer |
| Refund and cancellation | Not applicable | none |
| Acceptable Use Policy | Inside Terms section 4 | Optional separate page |
| Copyright and Takedown Policy | **Missing** | Draft needed (contact and notice requirements) |
| Community Guidelines | **Missing** (partial in Terms) | Draft needed, ties to moderation |
| Grievance contact | **Missing** (contact form only) | Name, email, address and timelines, supplied by you |
| Security disclosure | `SECURITY.md` added with a placeholder contact. Not published on the website | Add a real contact, then optionally publish `/.well-known/security.txt` |

I did **not** publish new legal pages. They would need company and personal details I cannot invent (operator name and address, grievance officer, registration numbers, contact emails). When you have them, I can draft the pages from your facts, and a lawyer should review all of them.

## 8. Technical changes made for privacy

Self-service export and deletion, contact messages removed with the account, profile table no longer publicly readable, sign-up notice, privacy page updated, admin actions audited, AI cost and prompt-injection controls. Not done: consent records, retention automation, age gating, DPAs, monitoring.
