-- Phase 1 verification. Read-only — safe to run any time after
-- 001-004. Run each block and check against the "expect" comment.
-- If any block doesn't match, stop and investigate before moving to
-- Phase 2 (don't proceed to a Phase 5 RLS cutover on an unverified
-- foundation).

-- 1. Every business table has RLS enabled (should already have been
--    true before this migration for all but tenant/user_tenant/tenant_invite,
--    which 001 turned on explicitly).
-- expect: 18 rows, rowsecurity = true for every one.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in (
    'tenant', 'user_tenant', 'tenant_invite',
    'student', 'class', 'class_type', 'period', 'payment', 'instructors',
    'location', 'events', 'event_payment', 'notes', 'private_lessons',
    'private_lesson_logs', 'period_location_class', 'settings',
    'user_credit_balances'
)
order by relname;

-- 2. Every business table has a tenant_id column.
-- expect: 15 rows (the business tables from 002; tenant/user_tenant/
-- tenant_invite have their own id-based shape and aren't listed here).
select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'tenant_id'
  and table_name in (
    'student', 'class', 'class_type', 'period', 'payment', 'instructors',
    'location', 'events', 'event_payment', 'notes', 'private_lessons',
    'private_lesson_logs', 'period_location_class', 'settings',
    'user_credit_balances'
  )
order by table_name;

-- 3. No existing row was left unbackfilled.
-- expect: every count is 0. If any table shows a nonzero count, the
-- default-tenant backfill in 003 did not reach every row (e.g. it was
-- run before 002 finished, or a row was inserted between 002 and 003).
select 'student' as table_name, count(*) from public.student where tenant_id is null
union all select 'class', count(*) from public.class where tenant_id is null
union all select 'class_type', count(*) from public.class_type where tenant_id is null
union all select 'period', count(*) from public.period where tenant_id is null
union all select 'payment', count(*) from public.payment where tenant_id is null
union all select 'instructors', count(*) from public.instructors where tenant_id is null
union all select 'location', count(*) from public.location where tenant_id is null
union all select 'events', count(*) from public.events where tenant_id is null
union all select 'event_payment', count(*) from public.event_payment where tenant_id is null
union all select 'notes', count(*) from public.notes where tenant_id is null
union all select 'private_lessons', count(*) from public.private_lessons where tenant_id is null
union all select 'private_lesson_logs', count(*) from public.private_lesson_logs where tenant_id is null
union all select 'period_location_class', count(*) from public.period_location_class where tenant_id is null
union all select 'user_credit_balances', count(*) from public.user_credit_balances where tenant_id is null
union all select 'settings', count(*) from public.settings where tenant_id is null;

-- 4. Exactly one tenant exists (the default), and every non-student
--    profile is a member of it.
-- expect: tenant_count = 1.
select count(*) as tenant_count from public.tenant;

-- expect: 0 — every admin/staff profile should now have a membership row.
select count(*) as unattached_profiles
from public.profiles p
where p.role is distinct from 'student'
  and not exists (select 1 from public.user_tenant ut where ut.user_id = p.id);

-- expect one row per existing admin/staff profile, role mapped correctly
-- (profiles.role = 'admin' -> user_tenant.role = 'admin', everything
-- else -> 'staff').
select p.email, p.role as profile_role, ut.role as tenant_role
from public.profiles p
join public.user_tenant ut on ut.user_id = p.id
order by p.email;

-- 5. Helper functions exist and are SECURITY DEFINER + STABLE.
-- expect: 2 rows, both prosecdef = true, provolatile = 's'.
select proname, prosecdef, provolatile
from pg_proc
where proname in ('is_tenant_member', 'has_tenant_role');

-- 6. Every business table has at least one new tenant-scoped policy
--    (name starts with "tenant "), in ADDITION to its pre-existing
--    policies (old policies are still present — expected at this
--    stage, they're dropped only at the Phase 5 cutover).
-- expect: every table below has old_policy_count > 0 (pre-existing)
-- AND tenant_policy_count > 0 (newly added by 004).
select
    tablename,
    count(*) filter (where policyname like 'tenant %') as tenant_policy_count,
    count(*) filter (where policyname not like 'tenant %') as old_policy_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'student', 'class', 'class_type', 'period', 'payment', 'instructors',
    'location', 'events', 'event_payment', 'notes', 'private_lessons',
    'private_lesson_logs', 'period_location_class', 'settings',
    'user_credit_balances'
  )
group by tablename
order by tablename;

-- 7. Spot-check that the new policies don't change today's behavior yet
--    (they're additive/permissive, OR'd with the still-present old
--    ones). Run this AS the app currently does — from a regular
--    authenticated session, not this admin/SQL-editor connection — by
--    hitting the dashboard and confirming students/classes/payments
--    still load normally. This file can't simulate auth.uid() from the
--    SQL editor, so the real check is: log in to the app and confirm
--    nothing changed.
