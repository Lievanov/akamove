# Multi-tenant migrations

Run these against the `aka_move` Supabase project's SQL editor, **in
numeric order**, each one fully completing (and its verification file,
where present, checked) before the next starts.

## Phase 1 — schema, backfill, RLS foundation

1. `001_create_tenant_tables.sql` — `tenant`, `user_tenant`, `tenant_invite` tables, RLS on them, and the `is_tenant_member` / `has_tenant_role` helper functions.
2. `002_add_tenant_id_columns.sql` — nullable `tenant_id` column + index on every existing business table.
3. `003_backfill_default_tenant.sql` — creates the one "Default Studio" tenant, attaches every existing non-student profile to it, backfills `tenant_id` on every existing row.
4. `004_tenant_rls_policies.sql` — adds the tenant-scoped RLS policies for every table, alongside (not replacing) the existing permissive policies.
5. `005_verification.sql` — read-only checks; confirm every result matches its `expect` comment before moving on.

**Why nothing here is a breaking change yet:** every file is additive —
new tables, new nullable columns, new policies added *alongside* the
existing ones. Postgres OR's together all applicable permissive RLS
policies for a given command, so as long as the old `USING (true)` /
admin-only policies from `api/db_export.sql` are still in place, the
app's actual behavior is unchanged after running 001–004. The new
tenant-scoped policies only start actually enforcing isolation once the
old ones are dropped, at the Phase 5 cutover (008).

## Phase 3 — self-serve onboarding

6. `006_create_tenant_and_admin_rpc.sql` — `create_tenant_and_admin(name, plan)` RPC used by the "Create your studio" onboarding page.

## Phase 4 — invites

7. `007_accept_pending_invites_rpc.sql` — `accept_pending_invites()` RPC, called from `TenantContext` on every login for a user with zero tenant memberships.

## Phase 5 — app sweep + RLS cutover

The `api/*.js` sweep (every read on a business table now filters by
`tenant_id`, every insert now sets it) is app code, not a migration —
see the 16 `api/*.js` files under `api/`.

8. `008_rls_cutover.sql` — drops the old tenant-blind permissive policies and sets `tenant_id NOT NULL` on the 12 tables the sweep covers: `student, class, class_type, period, instructors, location, events, event_payment, notes, private_lessons, private_lesson_logs, period_location_class`. **This is the migration that actually makes isolation take effect** — run it only after the Phase 5 app code is deployed.
9. `009_cutover_verification.sql` — read-only checks for the cutover.

**`payment` and `user_credit_balances` are deliberately excluded from
008.** Both are written to by two database functions
(`handle_create_credit`, `handle_update_credit`) whose source isn't
captured anywhere in this repo — only in the live DB (see the `NOTE`
comment above `createCredit`/`updateCredit` in `api/credit/credit.js`).
Until those are pulled and confirmed to set `tenant_id`, cutting over
either table risks silent data loss (rows with a null `tenant_id`
becoming invisible under strict RLS) or hard insert failures (if
`NOT NULL` were added). `api/payment/payment.js` itself has already
been swept app-side; only the DB-level cutover for `payment` is on
hold. Follow-up: pull `pg_get_functiondef` for both functions, update
them to set `tenant_id`, then extend 008 (or a new migration) to cover
both tables.

## Phase 6 — settings restructuring

10. `010_settings_tenant_pk.sql` — restructures `settings`' primary key from `key` alone to `(tenant_id, key)`, enforces `tenant_id NOT NULL`, and cuts over its RLS (drops the old tenant-blind admin policies; the tenant-scoped admin policies from 004 already cover it). Paired with the `api/settings/settings.js` update (every read/write now includes `tenant_id`) — run only after that app code is deployed, same ordering as 008.

## Phase 7 — free trial

11. `011_tenant_trial.sql` — 14-day Pro Studio trial: `tenant.trial_status/trial_started_at/trial_ends_at/trial_code`, `trial_code` (extension codes) and `trial_usage` (one trial per user) tables, the new `create_tenant_and_admin(name, plan, trial, trial_code)` signature (replaces 006's), `redeem_trial_code(tenant_id, code)`, and an hourly `pg_cron` job running `expire_due_trials()` (moves ended trials to Starter). Also narrows `authenticated`'s UPDATE grant on `tenant` to `name, slug, plan, updated_at`, so admins can't rewrite their own trial dates. Deploy the matching app code (onboarding page, `api/tenant/tenant.js`) at the same time — the old two-arg RPC is dropped.

Trial admin, from the SQL editor:

```sql
-- Create a 2-month code (optionally: max_redemptions, expires_at, note)
insert into trial_code (code, trial_days, note) values ('MOVE60', 60, 'Studios we talk to');

-- Retire a code
update trial_code set active = false where code = 'MOVE60';

-- Hand-set a studio's trial end (also revives an expired trial)
update tenant
set trial_ends_at = trial_started_at + interval '60 days',
    trial_status = 'active', plan = 'pro studio'
where id = '<tenant id>';
```

## Phase 8 — onboarding

12. `012_profile_tours_seen.sql` — `profiles.tours_seen jsonb` (ids of the dashboard page tours a user has finished or skipped). Deploy with the onboarding app code (`app/context/OnboardingContext.jsx`); until it runs, tours never start on their own (the "?" menu can still replay them).

13. `013_class_type_unique_name.sql` — unique index on `class_type (tenant_id, lower(btrim(name)))` so a studio can't have two class types with the same name. Aborts and lists any existing duplicates, which must be merged by hand first (repoint `class.class_type`, delete the extra).

The setup checklist's "dismissed" flag needs no migration — it's the `onboarding_checklist_dismissed` key in the existing tenant-scoped `settings` table.

## Phase 9 — membership

14. `014_downgrade_tenant_plan.sql` — `plan_rank(plan)` and the admin-only `downgrade_tenant_plan(tenant_id, plan)` RPC behind Settings → Membership. Only moves to a lower plan (upgrades raise `not_a_downgrade` until billing exists); downgrading during an active trial ends the trial so `expire_due_trials()` can't later overwrite the chosen plan. Also removes `plan` from `authenticated`'s UPDATE grant on `tenant` (now `name, slug, updated_at`), so plan changes only go through the RPC. Deploy with the Membership tab (`app/dashboard/settings/membership/`, `api/tenant/tenant.js`) — until it runs, the tab's "Switch" buttons return an error.

## Phase 10 — Stripe billing

15. `015_billing.sql` — billing data model: `tenant.billing_exempt` (set on `default-studio`), `tenant_billing` (mirror of the Stripe customer + subscription; admins can select, only the service role writes), `stripe_event` (webhook idempotency) and `cancellation_feedback` (post-cancel survey), both service-role only. Adds `apply_stripe_subscription(...)`, the service-role-only function the webhook uses to set `tenant.plan`, and makes `downgrade_tenant_plan` raise `has_subscription` for studios billed through Stripe. **Data change:** moves every non-exempt studio on Studio / Pro Studio with no live subscription and no active trial to Starter; their staff lose dashboard access right away (no notification is sent yet). Before running, set `billing_exempt = true` on any other studio that must keep its plan.
16. `016_billing_verification.sql` — read-only checks for 015.
17. `017_signup_starts_on_starter.sql` — `create_tenant_and_admin` no longer grants a paid plan: without a trial, every new studio starts on Starter and onboarding sends the admin to Stripe Checkout for the plan they picked. Closes the hole where calling the RPC with `p_plan = 'studio'` gave a paid plan for free. Deploy with the Phase 4 onboarding change.

## Phase 11 — email + password sign-in

18. `018_email_password_auth.sql` — `handle_new_user` now takes the profile email from `auth.users.email` (email/password sign-ups have no email in their metadata, so their profiles got a null email and invites never attached) and backfills null profile emails. `accept_pending_invites` now matches the caller's **confirmed** `auth.users` email instead of the user-editable `profiles.email`. Deploy with `app/login` and `app/reset-password`. Supabase dashboard setup: Authentication → Providers → Email enabled with "Confirm email" **on**; Authentication → URL Configuration → add `<site>/reset-password` (and the localhost equivalent) to Redirect URLs.

## Phase 12 — punch passes

19. `019_punch_pass.sql` — backlog 001. `punch_pass_type` (the studio's pass catalog, admin-managed under Settings → Punch passes), `punch_pass` (a pass sold to a student, with its own price and payment method — not a `payment` row) and `punch_pass_entry` (one punch each; remaining entries are always `total_entries` minus the count, never stored). Punches are created only through `record_punch(student_id, used_at, class_id, location_id, notes)`, which locks the student's passes and uses the oldest usable pass first (passes are used in the order they were bought; expired ones are skipped), raising `no_active_pass` when there's none; "usable" is judged on the punch's date in the studio's `settings.timezone`. Staff can sell and edit passes and correct or undo punches; only admins delete a pass. Column grants stop a punch from moving to another pass or a pass to another student, and a trigger refuses lowering a pass's entries below what's used (`entries_below_used`). No data changes. Deploy with the student-page punch pass card, `app/dashboard/settings/punch-passes/` and `api/punch_pass/punch_pass.js` — until it runs, the student page shows "Couldn't load punch passes".

## Phase 13 — automatic monthly periods

20. `020_auto_create_periods.sql` — backlog 002. `auto_create_periods()`, run hourly by `pg_cron` (`auto-create-periods`, at :10): for each Studio / Pro Studio studio with `settings.period_auto_create.enabled`, once the configured day (1–28) arrives in the studio's `settings.timezone`, it creates next month's period (1st to last day, named by `auto_period_name(month, name_format)`), copying the latest period's schedule with the same classes and its prices (falling back to `default_prices`). Enrollments aren't carried over, and no push notification is sent. `period_auto_run` (one row per studio and month) makes it idempotent — a deleted auto-created period isn't recreated — and records `skipped_existing` when the month already has a period created by hand; staff dismiss the Periods page notice by setting `reviewed_at` (the only column they can write). No data changes. Deploy with the Settings → Automatic Monthly Periods section and the Periods page notice; until it runs, that notice silently shows nothing. To test without waiting: `select public.auto_create_periods();`.

## Phase 14 — RLS audit

21. `021_rls_audit.sql` — every table, view and policy checked against the live schema and the app's reads/writes. **Security fixes:** drops `payment`'s leftover `true` policies (anyone with the public anon key could read, insert and update every studio's payments — the cutover 008 deferred; `handle_create_credit` / `handle_update_credit`, the reason for deferring, don't exist in the live DB) and backfills + enforces `payment.tenant_id NOT NULL`; replaces `profiles`' "viewable by everyone" with own profile + people in the same studio (`shares_tenant_with`); revokes the `student_credit_balance` materialized view (all students' credit totals, readable by anon). **Behavior fix:** staff can now read `settings` (the studio timezone on payment and punch pass pages); writes stay admin-only. **Completes policy sets:** admin update/delete on `class_type`, admin delete on `student`, `period`, `payment`, admin update/delete on `private_lesson_logs`, and `user_credit_balances` drops two dead policies and gets `tenant_id NOT NULL`. Revokes anon/authenticated grants on service-role-only tables (`cancellation_feedback`, `deletion_requests`, `stripe_event`, `trial_code`) and anon execute on the RPCs that need a signed-in user. Fails (and changes nothing) if a `payment` / `user_credit_balances` row has no `tenant_id` and no student to take it from. The push-notification routes it mentions were later removed (006, C1). Covered by `e2e/isolation.spec.mjs`.

## Phase 15 — account deletion

22. `022_account_deletion.sql` — backlog 006, H4. `tenant_invite.invited_by` now `ON DELETE SET NULL`: before, deleting any user who had ever sent an invite failed with a foreign-key error (the delete-account route returned 500). Invites stay with the studio. No data changes. Deploy with the `app/api/account/delete` change that refuses a studio's only admin (409 `sole_admin`). Covered by `e2e/account.spec.mjs`. Local/test copy: `supabase/migrations/20261013000000_account_deletion.sql`.

## After running any migration

- Run its paired verification file, if one exists, and confirm every
  block matches its `expect` comment.
- Log in to the dashboard and confirm behavior matches what's expected
  for that phase.
- Re-export the schema (`pg_dump --schema=public --schema-only ...` or
  the Supabase dashboard's schema export) into `api/db_export.sql` so it
  reflects the current state for future reference.

## Not yet done (deliberately deferred)

- `payment` / `user_credit_balances` RLS cutover + `NOT NULL` — see
  above, blocked on the two unreviewed credit RPCs.
- `deletion_requests` — excluded from `tenant_id` entirely; it has no
  RLS policies (service-role access only) and isn't studio data.

### Testing billing (Phase 10)

**Automated — `npm run billing:scenarios`.** Runs the real `lib/billing` code against your Stripe sandbox on test clocks (renewals and trial ends in seconds), with the database faked so Supabase is never touched. Covers: subscribe, upgrade (charged amount = preview), monthly → yearly, declined card and 3D Secure on upgrade, scheduled downgrade → applied at period end → upgrade again, undo a downgrade, cancel → resume → cancel → Starter, failed renewal → past_due → cancel voids the invoice, and trial → first charge on the trial date. Needs a sandbox key and Stripe Tax settings (head office address) in that sandbox; refuses live keys. Pass a word to run a subset: `npm run billing:scenarios -- downgrade`.

**By hand — webhook delivery, Checkout and the Portal** (not reachable from a script). With migrations 015–017 run, `npm run dev`, and the [Stripe CLI](https://docs.stripe.com/stripe-cli) running `stripe listen --forward-to localhost:3000/api/billing/webhook` (its `whsec_…` in `STRIPE_WEBHOOK_SECRET`):

- [ ] Onboarding → pick Studio (no trial) → Stripe Checkout with `4242 4242 4242 4242` → back on Membership, "Confirming your payment…" → Studio, card shown.
- [ ] Same with `4000 0025 0000 3155` (3D Secure) — complete and fail the challenge.
- [ ] Back out of Checkout → "Checkout cancelled — nothing was charged", studio stays on Starter.
- [ ] Trial studio → "Keep Pro Studio after the trial" → Checkout shows $0 today; Membership shows the trial end date as the first charge.
- [ ] Upgrade dialog shows the amount and tax; after paying, the plan changes.
- [ ] Switch to a lower plan → "Switches to … on {date}" → "Keep …" undoes it.
- [ ] Cancel → survey (answer once, skip once) → "Cancels on {date}" → Resume.
- [ ] Update card → Portal opens on the card screen; back in the app the new last 4 digits show.
- [ ] Invoices & billing details → Portal has no cancel or plan-change options.
- [ ] `stripe trigger invoice.payment_failed` style checks: in the Stripe Dashboard, `stripe_event` rows get `processed_at`; resending an event from the Dashboard is skipped as a duplicate.
