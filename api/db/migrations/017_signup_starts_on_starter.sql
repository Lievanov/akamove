-- Phase 10: Stripe billing — signup can't grant a paid plan.
--
-- Until now create_tenant_and_admin accepted p_plan = 'studio' / 'pro
-- studio' (011), so anyone could call the RPC and get a paid plan without
-- paying. A paid plan now only comes from a Stripe subscription
-- (apply_stripe_subscription, 015): signup creates the studio on Starter
-- and onboarding sends the admin to Checkout for the plan they picked.
--
-- p_plan is kept (and validated) so existing callers don't break, but
-- anything other than the free trial starts on Starter.

begin;

create or replace function public.create_tenant_and_admin(
    p_name text,
    p_plan text default 'starter',
    p_trial boolean default false,
    p_trial_code text default null
)
returns public.tenant
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    new_tenant public.tenant;
    v_trial_days integer := 14;
    v_code text := nullif(upper(btrim(coalesce(p_trial_code, ''))), '');
begin
    if auth.uid() is null then
        raise exception 'must be authenticated to create a tenant';
    end if;

    if p_name is null or btrim(p_name) = '' then
        raise exception 'tenant name is required';
    end if;

    if not p_trial then
        if p_plan not in ('starter', 'studio', 'pro studio') then
            raise exception 'invalid plan: %', p_plan;
        end if;

        -- Paid plans start once Checkout is paid; until then, Starter.
        insert into public.tenant (name, plan)
        values (btrim(p_name), 'starter')
        returning * into new_tenant;
    else
        if exists (select 1 from public.trial_usage where user_id = auth.uid()) then
            raise exception 'trial_already_used';
        end if;

        if v_code is not null then
            v_trial_days := public.consume_trial_code(v_code);
        end if;

        insert into public.tenant (name, plan, trial_status, trial_started_at, trial_ends_at, trial_code)
        values (
            btrim(p_name),
            'pro studio',
            'active',
            now(),
            now() + make_interval(days => v_trial_days),
            v_code
        )
        returning * into new_tenant;

        insert into public.trial_usage (user_id, tenant_id)
        values (auth.uid(), new_tenant.id);
    end if;

    insert into public.user_tenant (user_id, tenant_id, role)
    values (auth.uid(), new_tenant.id, 'admin');

    return new_tenant;
end;
$$;

comment on function public.create_tenant_and_admin(text, text, boolean, text) is 'Atomically creates a tenant and makes the calling user its admin. p_trial starts a 14-day Pro Studio trial (one per user); otherwise the studio starts on Starter whatever p_plan says — paid plans come from Stripe Checkout.';

commit;
