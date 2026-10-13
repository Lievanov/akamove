---
status: next
priority: critical
depends_on: []
---
# Security, abuse limits, privacy & legal compliance

## Goal
Make aka Move safe to put in front of paying studios: no known vulnerabilities, no
endpoint a bot can abuse to run up cloud costs, a clear story for the personal data we
hold (much of it about minors), and the legal documents a SaaS that bills by subscription
needs. Must be finished before production launch (→ 005).

Audit done 2026-10-12 against branch `fix/impeccable-audit` (code + `supabase/migrations/`
baseline + pending migrations 018–021). Findings are listed first; stories follow by phase.

> The legal items below are an engineering checklist, not legal advice. Phase 4 includes
> having a lawyer review the documents before launch.

## Findings

### Critical
- **C1 — Push notification routes have no auth.** `POST /api/notifications/period` and
  `/event` accept any request, read *every* push token with the service role, and send the
  caller's `name` / `event_name` as the notification title. Anyone on the internet can push
  arbitrary text to every user of every studio, as often as they like. Even legit use is
  cross-tenant: studio A releasing a period notifies studio B's users.
  (`app/api/notifications/*/route.js`, called from `api/period/period.js:9`, `api/events/events.js:6`)
- **C2 — Migration 021 not applied yet.** Until it runs on a database, every studio's
  `payment` rows are readable, insertable and updatable with the public anon key (signed in
  or not), and every user's email + push token is public via `profiles`. 021 fixes both;
  it is still untracked in git.
- **C3 — Next.js 14.2.16 has 20+ published advisories** (`npm audit`: 1 critical, 1 high),
  including RSC denial of service, cache poisoning, server-function endpoint disclosure and
  an Image Optimization RCE. Several need features we don't use (middleware, rewrites,
  Windows hosting), but the line is out of support; the fix is a major upgrade.

### High
- **H1 — Role and plan limits are UI-only.** `app/dashboard/access.js` hides periods,
  settings, instructors, locations from staff, and blocks staff entirely on Starter — but
  RLS only checks `is_tenant_member`. A staff user (or a blocked Starter staff user) can
  call Supabase directly to edit periods, instructors and **payment amounts**. Student
  limits per plan (`app/components/membership/plans.js`) are also client-side only.
- **H2 — No rate limiting anywhere.** Public/semi-public endpoints: `delete-request`
  (unauthenticated, writes a row per call), the notification routes (C1), sign-up / login /
  password reset / magic link (email-sending → email bombing and SMTP quota burn),
  `create_tenant_and_admin` (unlimited studios per user), `redeem_trial_code` /
  `consume_trial_code` (code guessing). No captcha.
- **H3 — No hard cost ceiling.** Nothing caps Cloud Run instances, Supabase usage or email
  sends; budget alerts (planned in 005) only notify.
- **H4 — Account deletion fails for anyone who ever sent an invite.**
  `tenant_invite.invited_by` references `auth.users` with no `ON DELETE` rule, so
  `auth.admin.deleteUser` errors (500). It also doesn't handle a sole admin (orphaned
  studio) or cancel that studio's Stripe subscription.
- **H5 — Deletion requests are unverified.** `/delete-account` takes any email. Whoever
  processes `deletion_requests` must confirm the requester owns the address first, or one
  person can get another's account deleted.

### Medium
- **M1 — No security headers.** No CSP, HSTS, `X-Frame-Options`/`frame-ancestors`
  (clickjacking), `Referrer-Policy`, `Permissions-Policy` (`next.config.mjs`).
- **M2 — Weak auth settings.** Local config: 6-char minimum password, no character
  requirements, no captcha, no leaked-password check. The cloud project's settings need the
  same review (local `supabase/config.toml` ≠ cloud dashboard). No MFA option for admins.
- **M3 — Staff can delete classes, events, instructors, notes, private lessons, punch
  entries** (`is_tenant_member` delete policies). Decide if that's intended; there's no
  audit trail of who changed or deleted what (only `punch_pass_entry.recorded_by`).
- **M4 — Unbounded text columns** (notes, names, descriptions) — storage abuse, and huge
  values break the UI. Add length `CHECK`s.
- **M5 — Broad table grants.** Supabase defaults grant `ALL` to `anon` on tenant tables.
  RLS blocks the rows, but anon never needs these tables; revoking is cheap defense in depth.
  Also confirm the API's max-rows limit and a `statement_timeout` for `anon`/`authenticated`.
- **M6 — Trial abuse.** One trial per *user*, but new emails are free → unlimited 14-day
  Pro trials. Captcha + email confirmation help; a card-on-file trial would close it.

### Automated jobs & cost (audit 2026-10-13)
Everything that runs without a user clicking: two `pg_cron` jobs, one Vercel cron, the Stripe
webhook, the notification routes and client-side polling. There are no Edge Functions, no
Realtime channels, no `pg_net` calls and no `setInterval` polling.

Cost model: `pg_cron` runs inside the Postgres instance you already pay for, so Supabase doesn't
bill per run. What costs money is compute size, egress, MAU and (outside Supabase) host function
invocations. Neither job is a cost risk; the risks are jobs that stop running without anyone noticing, or growing log tables.

| Job | Schedule | Verdict |
|---|---|---|
| `expire-due-trials` → `expire_due_trials()` (011) | hourly `:00` | OK — one `UPDATE` on the partial index `tenant_trial_active_idx`, only touches due trials, idempotent |
| `auto-create-periods` → `auto_create_periods()` (020) | hourly `:10` | OK — idempotent (`period_auto_run` PK + advisory lock), one subtransaction per studio, no push fan-out. Hourly is needed because each studio's "day" is in its own timezone; after the month's row exists each run is a PK lookup |
| `/api/billing/reconcile` (`vercel.json`) | daily 09:00 UTC | See J1, J2 |
| `/api/billing/webhook` (Stripe) | per event | OK — signature-checked, deduped by `stripe_event`. Concurrent redeliveries can both sync, which is harmless (sync always re-reads from Stripe) |
| `/api/notifications/*` | per period/event create | See C1 — fans out to every token of every studio, no dedupe |
| Membership page | after checkout: 10 polls × 2 s; on tab focus | OK — bounded. Tab-focus refetch is 2–3 queries |

- **J1 — Reconcile stops when we leave Vercel.** `vercel.json` is the only scheduler, and on
  Firebase App Hosting (005) nothing reads it. Billing would drift with no error.
  (Already a 005 story; 005's "Cloud Scheduler for period auto-create" story is now removed —
  that job already runs in `pg_cron`, so scheduling it again would run it twice.)
- **J2 — Reconcile has a scale ceiling.** It syncs every `tenant_billing` row one after another
  (one Stripe call + 2 DB writes each) within `maxDuration = 60`. At roughly 150–200 subscribed studios it
  times out, and the rows after that point never get re-synced. It also rewrites every row nightly even when nothing changed.
- **J3 — Silent job failures.** `auto_create_periods` turns a per-studio error into a
  `WARNING` that nobody reads. Reconcile failures go only to `console.error`. Nothing alerts
  if a cron job is unscheduled, inactive or failing.
- **J4 — Unbounded log tables.** `cron.job_run_details` gets one row per run (~17.5k/year from
  the two hourly jobs, never purged). `stripe_event` gets one row per webhook forever.
  `deletion_requests` accepts unlimited anonymous inserts (H2).
- **J5 — Cloud cron state isn't tracked in code.** The `supabase/` baseline has no
  `cron.schedule` calls, so local/test DBs have no jobs, and nothing checks that the cloud project has exactly
  the two expected jobs. `cron.schedule(name, …)` upserts by name, so re-running 011/020 is safe and won't add duplicates.

### Already good (keep)
- Stripe webhook verifies signatures on the raw body and is idempotent (`stripe_event`).
- Billing routes verify the bearer token and admin membership server-side; plans only change
  from Stripe, never from the redirect; `tenant` updates are column-restricted to `name`/`slug`.
- `accept_pending_invites` only matches a *confirmed* auth email (018).
- SECURITY DEFINER functions pin `search_path`; RPCs check tenant membership.
- No secrets in git (`.env*` ignored, only `.env.example` tracked); `api/db_export.sql` is schema only.
- No `dangerouslySetInnerHTML` / `eval`; OAuth/email redirects use the app's own origin.
- Tests run against local Supabase, never the cloud project.

## Stories — Phase 1: stop the bleeding (before any real data / users)
- [ ] Apply migrations 018–021 to the cloud project; run the verification scripts; commit them (C2)
- [ ] Notification routes: require bearer token + admin of the period's/event's studio, load
      the period/event server-side by id (don't trust the body), send only to tokens of that
      studio's users, cap one send per period/event (C1)
- [ ] Or, since there's no mobile app yet: disable the notification routes until 003 ships (C1)
- [ ] Fix account deletion: `invited_by ON DELETE SET NULL`, block or hand over when the user
      is a studio's only admin, cancel the studio's Stripe subscription if it's being removed (H4)
- [ ] Written procedure for `deletion_requests`: verify ownership by emailing the address,
      30-day SLA, log outcome (H5)

## Stories — Phase 2: enforce on the server what the UI enforces
- [ ] RLS: role-aware policies — admin-only writes on `period`, `period_location_class`,
      `instructors`, `location`; decide staff rights on `payment` update and the deletes in M3 (H1, M3)
- [ ] RLS: make `is_tenant_member` (or a new helper) return false for non-admins on Starter /
      expired trials, matching `planAllowsRole` (H1)
- [ ] DB trigger enforcing per-plan student limits on `student` insert (H1)
- [ ] E2E specs in `e2e/access.spec.mjs` that call Supabase directly as staff and assert the
      writes are refused (not just that the page is hidden)
- [ ] Revoke `anon` grants on all tenant tables; set `statement_timeout` for `anon` and
      `authenticated`; confirm API max rows (M5)
- [ ] Length `CHECK` constraints on free-text columns (M4)
- [ ] Audit log table (who, what, when, before/after) for payment, student and punch changes (M3)

## Stories — Phase 3: rate limits, bots and cost ceilings
- [ ] Captcha (Cloudflare Turnstile — Supabase Auth supports it natively) on sign-up, login,
      password reset, magic link and `/delete-account` (H2)
- [ ] Rate limiter for Next route handlers (per IP + per user), e.g. a Postgres-backed
      `rate_limit` table/RPC or Upstash; apply to every `app/api/*` route (H2)
- [ ] Cloud Supabase Auth rate limits reviewed (emails/hour, sign-ins, token refresh, OTP) (H2)
- [ ] Custom SMTP (Resend / Postmark / SES) with its own sending cap — Supabase's built-in SMTP
      is for testing only (H2)
- [ ] Cap studios per user (e.g. 3) in `create_tenant_and_admin`; throttle trial-code attempts (H2)
- [ ] Hard caps: `maxInstances` in `apphosting.yaml`, Supabase spend cap left ON, Firebase
      budget alerts at 50/90/100 %, optional budget → Pub/Sub → disable-billing kill switch (H3)
- [ ] Put the domain behind Cloudflare (free tier: WAF, bot fight mode, rate-limit rules, DDoS) (H2, H3)
- [ ] Decide trial abuse policy (M6)
- [ ] Verify cloud cron state: `select jobname, schedule, active from cron.job;` returns exactly
      `expire-due-trials` and `auto-create-periods`, and
      `select jobname, status, count(*) from cron.job_run_details join cron.job using (jobid)
      where start_time > now() - interval '7 days' group by 1, 2;` shows no failures (J5)
- [ ] Weekly `pg_cron` purge: `cron.job_run_details` older than 30 days, `stripe_event`
      processed more than 90 days ago (J4)
- [ ] Reconcile: page through `tenant_billing` (cursor + batch per run, or skip rows synced in the
      last 24 h by webhook), and only write when Stripe's state differs from ours (J2)
- [ ] Alerting: a daily check (e.g. inside reconcile) that reports failed `cron.job_run_details`
      runs and reconcile `failed[]` to the error monitor / an email (J3)

## Stories — Phase 4: privacy & legal
- [ ] **Privacy Policy** page: what we collect (staff accounts, student names, emails, phone,
      date of birth, payments), why, subprocessors (Supabase, Google/Firebase, Stripe, Expo,
      email provider), retention, rights requests, contact. Linked from footer, sign-up, login
- [ ] **Terms of Service**: subscription + auto-renewal terms, trial terms, cancellation and
      refunds, acceptable use, studio is responsible for having consent for the student data
      it enters (incl. parental consent for minors), limitation of liability, governing law
- [ ] **Data Processing Addendum (DPA)** for studios — we're their processor for student data;
      published subprocessor list
- [ ] Record acceptance of the Terms at sign-up (version + timestamp per user)
- [ ] Auto-renewal compliance (e.g. California ARL): clear price/renewal disclosure before
      checkout, reminder before trial converts and before annual renewal (Stripe Billing can
      email these), online cancellation (already have), notice before price changes
- [ ] Minors: no student logins until 003; when 003 is planned, COPPA review for under-13 users
- [ ] Data retention policy: how long after a studio cancels we keep its data, then delete;
      payment records kept for tax as required
- [ ] Studio data export (CSV of students, payments) — portability requests and no lock-in
- [ ] Data subject requests: a studio can delete/export one student; documented process for
      students who contact us directly (we forward to the studio)
- [ ] Google OAuth consent screen verification (needs privacy policy + terms URLs + domain)
- [ ] Accessibility statement + WCAG 2.1 AA pass (ADA web lawsuits) — overlaps the impeccable audit
- [ ] Lawyer review of Privacy Policy, Terms, DPA before launch
- [ ] Business: operate through an LLC; get cyber liability + tech E&O insurance

## Stories — Phase 5: ongoing hygiene
- [ ] Upgrade Next.js to a supported major (15/16) and React accordingly; re-run e2e (C3)
- [ ] Security headers incl. CSP in `next.config.mjs` (M1)
- [ ] Auth: 8+ char passwords with requirements, leaked-password protection, optional TOTP MFA
      for admins (M2)
- [ ] GitHub: Dependabot alerts + updates, secret scanning + push protection, branch protection on `main`
- [ ] CI: lint, `npm audit --omit=dev`, e2e on every PR
- [ ] MFA on every vendor account (GitHub, Supabase, Stripe, Google Cloud/Firebase, domain registrar, email)
- [ ] Use a Stripe restricted key (`rk_live_…`) with only the permissions billing needs
- [ ] Error monitoring (e.g. Sentry) with PII scrubbing; no student data in logs
- [ ] Backups: Supabase Pro daily backups (+ PITR if affordable); test a restore once
- [ ] Incident response plan: who to call, how to rotate keys, breach-notification obligations
      (US state laws; GDPR 72h if EU users)
- [ ] Re-run this audit before each major release

## Open questions
- Where are the studios (and their students)? US only, or also EU/UK/Latin America? This
  decides whether GDPR / LGPD / other regimes apply and the governing law in the Terms.
- Notification routes: secure them now, or disable until the mobile app (003) exists?
- What may staff do? Edit payment amounts? Delete classes, events, notes?
- Trials: keep no-card trials (simpler sign-up, more abuse) or require a card at trial start?
- Rate limiter: Postgres table (no new vendor) or Upstash (simpler, one more subprocessor)?
- Does Cloudflare go in front of Firebase App Hosting, or rely on Google's edge only?
- How long do we keep a cancelled studio's data before deleting it?
