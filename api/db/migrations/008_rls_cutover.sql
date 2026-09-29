-- Phase 5 cutover: this is the migration that actually makes tenant
-- isolation take effect. Run this ONLY after:
--   1. All Phase 1-4 migrations (001-007) have run successfully.
--   2. The Phase 5 app-layer sweep is deployed (every api/*.js read on a
--      business table filters by tenant_id, every insert sets it) —
--      see 005/006/007 verification and the app code in api/*.js.
--   3. 005_verification.sql's block 3 (no un-backfilled rows) still
--      passes for every table touched here.
--
-- Scope: student, class, class_type, period, instructors, location,
-- events, event_payment, notes, private_lessons, private_lesson_logs,
-- period_location_class.
--
-- DELIBERATELY EXCLUDED from this cutover: `payment` and
-- `user_credit_balances`. Both are written to by two database functions
-- (handle_create_credit, handle_update_credit) whose source isn't
-- captured anywhere in this repo — only in the live DB. Until those are
-- reviewed and confirmed to set tenant_id correctly, cutting over their
-- RLS or adding NOT NULL risks either insert failures or credit rows
-- silently becoming invisible through RLS. api/payment/payment.js has
-- already been swept to filter/set tenant_id on the app side, so this
-- is safe to defer — payment isolation today still relies on app-layer
-- filtering plus the old permissive policies, same as before this
-- migration. Revisit as a follow-up once handle_create_credit /
-- handle_update_credit are reviewed.
--
-- Wrapped in a transaction: the pre-check aborts the whole migration if
-- any row would violate the new NOT NULL constraint, before any policy
-- is dropped.

begin;

do $$
declare
    bad_count bigint;
begin
    select
        (select count(*) from public.student where tenant_id is null) +
        (select count(*) from public.class where tenant_id is null) +
        (select count(*) from public.class_type where tenant_id is null) +
        (select count(*) from public.period where tenant_id is null) +
        (select count(*) from public.instructors where tenant_id is null) +
        (select count(*) from public.location where tenant_id is null) +
        (select count(*) from public.events where tenant_id is null) +
        (select count(*) from public.event_payment where tenant_id is null) +
        (select count(*) from public.notes where tenant_id is null) +
        (select count(*) from public.private_lessons where tenant_id is null) +
        (select count(*) from public.private_lesson_logs where tenant_id is null) +
        (select count(*) from public.period_location_class where tenant_id is null)
    into bad_count;

    if bad_count > 0 then
        raise exception 'Aborting: % row(s) with a null tenant_id across the cutover tables. Re-run 003_backfill_default_tenant.sql (or investigate rows inserted since) before cutting over.', bad_count;
    end if;
end $$;

-- Drop the old tenant-blind permissive policies -------------------------

drop policy "Allow all users to Update student" on public.student;
drop policy "Enable insert access for all users" on public.student;
drop policy "Enable read access for all users" on public.student;

drop policy "Enable delete for users based on user_id" on public.class;
drop policy "Enable insert for all users" on public.class;
drop policy "Enable read access for all users" on public.class;
drop policy "Enable update for users based on email" on public.class;

drop policy "Enable insert for authenticated users only" on public.class_type;
drop policy "Enable read access for all users" on public.class_type;

drop policy "Enable insert for authenticated users only" on public.period;
drop policy "Enable read access for all users" on public.period;
drop policy "Enable update for users based on email" on public.period;

drop policy "Authenticated users can delete instructors" on public.instructors;
drop policy "Authenticated users can insert instructors" on public.instructors;
drop policy "Authenticated users can select instructors" on public.instructors;
drop policy "Authenticated users can update instructors" on public.instructors;

drop policy "Admins can delete locations." on public.location;
drop policy "Admins can insert locations." on public.location;
drop policy "Admins can update locations." on public.location;
drop policy "public can view locations." on public.location;

drop policy events_delete_authenticated on public.events;
drop policy events_insert_authenticated on public.events;
drop policy events_select_authenticated on public.events;
drop policy events_update_authenticated on public.events;

drop policy event_payment_delete_authenticated on public.event_payment;
drop policy event_payment_insert_authenticated on public.event_payment;
drop policy event_payment_select_authenticated on public.event_payment;
drop policy event_payment_update_authenticated on public.event_payment;

drop policy "Enable delete for authenticated users only" on public.notes;
drop policy "Enable insert for authenticated users only" on public.notes;
drop policy "Enable read access for all users" on public.notes;
drop policy "Enable update for authenticated users only" on public.notes;

drop policy "Authenticated users can delete private_lessons" on public.private_lessons;
drop policy "Authenticated users can insert private_lessons" on public.private_lessons;
drop policy "Authenticated users can select private_lessons" on public.private_lessons;
drop policy "Authenticated users can update private_lessons" on public.private_lessons;

drop policy "Authenticated users can insert private_lesson_logs" on public.private_lesson_logs;
drop policy "Authenticated users can select private_lesson_logs" on public.private_lesson_logs;

drop policy "Admins can delete." on public.period_location_class;
drop policy "Admins can insert." on public.period_location_class;
drop policy "Admins can update." on public.period_location_class;
drop policy "public can view." on public.period_location_class;

-- Enforce tenant_id everywhere it's now the only access path ------------

alter table public.student alter column tenant_id set not null;
alter table public.class alter column tenant_id set not null;
alter table public.class_type alter column tenant_id set not null;
alter table public.period alter column tenant_id set not null;
alter table public.instructors alter column tenant_id set not null;
alter table public.location alter column tenant_id set not null;
alter table public.events alter column tenant_id set not null;
alter table public.event_payment alter column tenant_id set not null;
alter table public.notes alter column tenant_id set not null;
alter table public.private_lessons alter column tenant_id set not null;
alter table public.private_lesson_logs alter column tenant_id set not null;
alter table public.period_location_class alter column tenant_id set not null;

commit;
