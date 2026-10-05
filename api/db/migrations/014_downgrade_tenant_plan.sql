-- Phase 9: self-serve plan downgrades (Settings → Membership).
--
-- Admins can move their studio to a LOWER plan themselves. Upgrades stay
-- off the client until billing exists — otherwise any admin could give
-- themselves Pro Studio for free with one API call.
--
-- Downgrading during an active trial ends the trial now. Without that,
-- the trial would stay 'active' and expire_due_trials() (011) would later
-- overwrite the chosen plan with 'starter'. trial_usage is untouched, so
-- the trial can't be restarted (a trial code can still revive it, as
-- redeem_trial_code already allows for expired trials).

-- Plans in order, lowest first. Mirrors the check constraint in 001.
create or replace function public.plan_rank(p_plan text)
returns integer
language sql
immutable
as $$
    select case p_plan
        when 'starter' then 1
        when 'studio' then 2
        when 'pro studio' then 3
    end
$$;

create or replace function public.downgrade_tenant_plan(p_tenant_id uuid, p_plan text)
returns public.tenant
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    t public.tenant;
    current_plan text;
begin
    if not public.has_tenant_role(p_tenant_id, array['admin']) then
        raise exception 'not_tenant_admin';
    end if;

    if public.plan_rank(p_plan) is null then
        raise exception 'invalid_plan';
    end if;

    select * into t from public.tenant where id = p_tenant_id for update;

    -- A trial past its end date is already Starter, even before the
    -- hourly job runs (same rule as api/tenant/tenant.js).
    current_plan := case
        when t.trial_status = 'active' and t.trial_ends_at <= now() then 'starter'
        else t.plan
    end;

    if public.plan_rank(p_plan) >= public.plan_rank(current_plan) then
        raise exception 'not_a_downgrade';
    end if;

    update public.tenant
    set plan = p_plan,
        trial_status = case when trial_status = 'active' then 'expired' else trial_status end,
        trial_ends_at = case when trial_status = 'active' then least(trial_ends_at, now()) else trial_ends_at end,
        updated_at = now()
    where id = p_tenant_id
    returning * into t;

    return t;
end;
$$;

comment on function public.downgrade_tenant_plan(uuid, text) is 'Admin-only: moves the tenant to a lower plan; ends an active trial. Upgrades are rejected (not_a_downgrade) until billing exists.';

grant execute on function public.downgrade_tenant_plan(uuid, text) to authenticated;

-- Plan changes now go only through the function above (or through us, as
-- service role). Narrow 011's column grant: drop `plan`.
revoke update on public.tenant from authenticated;
grant update (name, slug, updated_at) on public.tenant to authenticated;
