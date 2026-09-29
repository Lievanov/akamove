-- Phase 1 / Step 3: create the one default tenant for existing production
-- data, attach existing users to it, and backfill tenant_id on every
-- existing row. Safe to run against production: RLS is still permissive
-- (old `true`-gated policies untouched), so nothing here changes what
-- the live app can see or do — it only populates the new columns.
--
-- Uses a fixed slug ('default-studio') + `on conflict do nothing` /
-- `where tenant_id is null` guards throughout so this file can be
-- re-run safely if it's interrupted partway through.

insert into public.tenant (name, plan, slug)
values ('Default Studio', 'studio', 'default-studio')
on conflict (slug) do nothing;

-- 1. Attach existing users to the default tenant.
-- profiles.role today is 'admin', 'student', or anything else (legacy
-- default is 'user', CLAUDE.md's documented default is 'staff' — both
-- collapse to 'staff' here). 'student' rows are mobile-app-only accounts
-- with no dashboard access and are intentionally skipped — they should
-- never become a tenant member.
insert into public.user_tenant (user_id, tenant_id, role)
select
    p.id,
    t.id,
    case when p.role = 'admin' then 'admin' else 'staff' end
from public.profiles p
cross join (select id from public.tenant where slug = 'default-studio') t
where p.role is distinct from 'student'
on conflict (user_id, tenant_id) do nothing;

-- 2. Backfill tenant_id on every existing business-table row.
do $$
declare
    default_tenant_id uuid;
begin
    select id into default_tenant_id from public.tenant where slug = 'default-studio';

    update public.student set tenant_id = default_tenant_id where tenant_id is null;
    update public.class set tenant_id = default_tenant_id where tenant_id is null;
    update public.class_type set tenant_id = default_tenant_id where tenant_id is null;
    update public.period set tenant_id = default_tenant_id where tenant_id is null;
    update public.payment set tenant_id = default_tenant_id where tenant_id is null;
    update public.instructors set tenant_id = default_tenant_id where tenant_id is null;
    update public.location set tenant_id = default_tenant_id where tenant_id is null;
    update public.events set tenant_id = default_tenant_id where tenant_id is null;
    update public.event_payment set tenant_id = default_tenant_id where tenant_id is null;
    update public.notes set tenant_id = default_tenant_id where tenant_id is null;
    update public.private_lessons set tenant_id = default_tenant_id where tenant_id is null;
    update public.private_lesson_logs set tenant_id = default_tenant_id where tenant_id is null;
    update public.period_location_class set tenant_id = default_tenant_id where tenant_id is null;
    update public.user_credit_balances set tenant_id = default_tenant_id where tenant_id is null;
    update public.settings set tenant_id = default_tenant_id where tenant_id is null;
end $$;
