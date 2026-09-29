-- Phase 3: self-serve "create your studio" onboarding RPC.
--
-- A brand-new user with zero tenant memberships can't insert into
-- `tenant` (no insert policy exists on it — see 001) or `user_tenant`
-- (insert is admin-gated, and they aren't a member of anything yet to
-- be an admin of). This SECURITY DEFINER function is the one sanctioned
-- way around that chicken-and-egg: it creates the tenant and makes the
-- calling user its admin in a single atomic transaction, re-validating
-- the caller's identity itself rather than relying on the (deliberately
-- restrictive) table-level policies.

create or replace function public.create_tenant_and_admin(p_name text, p_plan text default 'starter')
returns public.tenant
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    new_tenant public.tenant;
begin
    if auth.uid() is null then
        raise exception 'must be authenticated to create a tenant';
    end if;

    if p_name is null or btrim(p_name) = '' then
        raise exception 'tenant name is required';
    end if;

    if p_plan not in ('starter', 'studio', 'pro studio') then
        raise exception 'invalid plan: %', p_plan;
    end if;

    insert into public.tenant (name, plan)
    values (btrim(p_name), p_plan)
    returning * into new_tenant;

    insert into public.user_tenant (user_id, tenant_id, role)
    values (auth.uid(), new_tenant.id, 'admin');

    return new_tenant;
end;
$$;

comment on function public.create_tenant_and_admin(text, text) is 'Atomically creates a tenant and makes the calling user its admin. Self-serve onboarding entry point (Phase 3).';

grant execute on function public.create_tenant_and_admin(text, text) to authenticated;
