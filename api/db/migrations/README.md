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
