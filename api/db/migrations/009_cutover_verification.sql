-- Post-cutover verification for 008. Read-only. Run after 008 and check
-- each block against its `expect` comment.

-- 1. NOT NULL is enforced on all 12 cutover tables (and NOT on payment /
--    user_credit_balances, which are deliberately still nullable).
-- expect: is_nullable = 'NO' for all 12 rows; payment and
-- user_credit_balances won't appear here since we're filtering to the
-- 12 — run a second check separately if you want to confirm those two
-- are still 'YES'.
select table_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name = 'tenant_id'
  and table_name in (
    'student', 'class', 'class_type', 'period', 'instructors', 'location',
    'events', 'event_payment', 'notes', 'private_lessons',
    'private_lesson_logs', 'period_location_class'
  )
order by table_name;

-- expect: is_nullable = 'YES' for both.
select table_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name = 'tenant_id'
  and table_name in ('payment', 'user_credit_balances');

-- 2. Only tenant-scoped policies remain on the 12 cutover tables — the
--    old permissive ones are gone.
-- expect: old_policy_count = 0 for every row; tenant_policy_count > 0.
select
    tablename,
    count(*) filter (where policyname like 'tenant %') as tenant_policy_count,
    count(*) filter (where policyname not like 'tenant %') as old_policy_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'student', 'class', 'class_type', 'period', 'instructors', 'location',
    'events', 'event_payment', 'notes', 'private_lessons',
    'private_lesson_logs', 'period_location_class'
  )
group by tablename
order by tablename;

-- 3. payment and user_credit_balances still have BOTH their old
--    permissive/own-access policies AND the Phase 1 tenant policies
--    (untouched by this cutover, as intended).
-- expect: both old_policy_count > 0 and tenant_policy_count > 0 for
-- both tables.
select
    tablename,
    count(*) filter (where policyname like 'tenant %') as tenant_policy_count,
    count(*) filter (where policyname not like 'tenant %') as old_policy_count
from pg_policies
where schemaname = 'public'
  and tablename in ('payment', 'user_credit_balances')
group by tablename;

-- 4. Real behavior check (do this in the app, not SQL): log in as a
--    staff/admin user and confirm students, classes, payments, events,
--    instructors, locations, notes, and private lessons all still load
--    and can be created/edited/deleted as expected. Then, if you have a
--    second tenant (from onboarding/invite testing), switch to it and
--    confirm it sees none of the first tenant's data.
