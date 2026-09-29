-- Phase 6: settings table restructuring.
--
-- `settings` was a pure global key/value store (`key text primary key`).
-- 003_backfill_default_tenant.sql already tagged every existing row
-- with the default tenant's id, so tenant_id is populated for every row
-- already — this migration just changes the key shape and cuts over
-- RLS to match, paired with the api/settings/settings.js update in the
-- same commit as this migration (composite key means every read/write
-- must include tenant_id going forward, or it silently misses/creates
-- the wrong row).
--
-- Run this only after api/settings/settings.js has been updated and
-- deployed (same ordering rationale as 008_rls_cutover.sql).

begin;

do $$
declare
    bad_count bigint;
begin
    select count(*) into bad_count from public.settings where tenant_id is null;
    if bad_count > 0 then
        raise exception 'Aborting: % settings row(s) with a null tenant_id. Re-run 003_backfill_default_tenant.sql before restructuring the key.', bad_count;
    end if;
end $$;

alter table public.settings alter column tenant_id set not null;

alter table public.settings drop constraint settings_pkey;
alter table public.settings add constraint settings_pkey primary key (tenant_id, key);

-- Cut over RLS: drop the old admin-gated (but tenant-blind) policies —
-- the tenant-scoped admin policies from 004_tenant_rls_policies.sql
-- ("tenant admins select/insert/update" on settings) already cover the
-- same shape (admin-only, all actions) and remain.
drop policy "Admins can insert settings." on public.settings;
drop policy "Admins can read settings." on public.settings;
drop policy "Admins can update settings." on public.settings;

commit;
