-- Phase 7: 14-day Pro Studio free trial + extension codes.
--
-- A new studio can start on a free Pro Studio trial (no card). When it
-- ends, the studio is moved to Starter. Studios we talk to directly can
-- get a longer trial via a code (e.g. 60 days) — entered at signup or
-- later from the dashboard — and we can always hand-edit trial_ends_at.
--
-- trial_status lifecycle:
--   null        never trialed (picked a plan directly)
--   'active'    on the trial; plan = 'pro studio'
--   'expired'   trial ran out; plan moved to 'starter' by expire_due_trials()
--   'converted' reserved for Stripe: paid before/after the trial ended, so
--               expire_due_trials() must leave it alone
--
-- Plans are still labels only (see 001) and there's no billing yet —
-- this only records trial state; enforcement and payment come later.

-- tenant trial columns -------------------------------------------------

alter table public.tenant
    add column trial_status text check (trial_status in ('active', 'expired', 'converted')),
    add column trial_started_at timestamp with time zone,
    add column trial_ends_at timestamp with time zone,
    add column trial_code text;

comment on column public.tenant.trial_status is 'null = never trialed; active / expired / converted (converted reserved for Stripe).';
comment on column public.tenant.trial_ends_at is 'Editable by us (SQL editor) to extend a trial by hand; admins extend it only via redeem_trial_code.';
comment on column public.tenant.trial_code is 'The trial_code applied to this tenant, if any (one per tenant).';

create index tenant_trial_active_idx on public.tenant (trial_ends_at) where (trial_status = 'active');

-- The existing "tenant admins can update tenant" policy covers every
-- column, which would let an admin rewrite their own trial dates from
-- the client. Narrow the authenticated role's UPDATE grant to the
-- columns admins legitimately edit; trial columns change only through
-- the SECURITY DEFINER functions below (or by us, as service role).
revoke update on public.tenant from authenticated;
grant update (name, slug, plan, updated_at) on public.tenant to authenticated;

-- trial_code: codes we hand out to studios that contact us ------------

create table public.trial_code (
    code text primary key check (code = upper(btrim(code))),
    trial_days integer not null check (trial_days > 0),
    active boolean not null default true,
    max_redemptions integer check (max_redemptions > 0),
    redemption_count integer not null default 0,
    expires_at timestamp with time zone,
    note text,
    created_at timestamp with time zone not null default now()
);

comment on table public.trial_code is 'Trial-length codes (e.g. 60 days). Managed by us in the SQL editor; no client access. max_redemptions / expires_at null = unlimited.';

-- RLS on, no policies: only the service role / SECURITY DEFINER
-- functions can read it, so codes can't be enumerated from the client.
alter table public.trial_code enable row level security;

-- trial_usage: one free trial per user, ever ---------------------------

create table public.trial_usage (
    user_id uuid primary key references auth.users(id) on delete cascade,
    tenant_id uuid references public.tenant(id) on delete set null,
    started_at timestamp with time zone not null default now()
);

comment on table public.trial_usage is 'Users who have started a free trial. Primary key enforces one trial per user, even if they create another studio.';

alter table public.trial_usage enable row level security;

-- Lets onboarding hide the trial option for someone who already used it.
create policy "users can see own trial usage" on public.trial_usage
    for select using (user_id = auth.uid());

-- Internal helper: consume a code and return the trial length it grants.
-- Atomic increment so max_redemptions can't be overshot by a race.
create or replace function public.consume_trial_code(p_code text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    granted_days integer;
begin
    update public.trial_code
    set redemption_count = redemption_count + 1
    where code = upper(btrim(p_code))
      and active
      and (expires_at is null or expires_at > now())
      and (max_redemptions is null or redemption_count < max_redemptions)
    returning trial_days into granted_days;

    if granted_days is null then
        raise exception 'invalid_trial_code';
    end if;

    return granted_days;
end;
$$;

revoke all on function public.consume_trial_code(text) from public, anon, authenticated;

-- create_tenant_and_admin: now optionally starts the trial -------------
-- Signature changes, so drop the 006 version rather than leave an
-- overload behind.

drop function if exists public.create_tenant_and_admin(text, text);

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

        insert into public.tenant (name, plan)
        values (btrim(p_name), p_plan)
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

comment on function public.create_tenant_and_admin(text, text, boolean, text) is 'Atomically creates a tenant and makes the calling user its admin. p_trial starts a 14-day Pro Studio trial (one per user); p_trial_code swaps in that code''s length.';

grant execute on function public.create_tenant_and_admin(text, text, boolean, text) to authenticated;

-- redeem_trial_code: extend an existing trial from the dashboard -------
-- New end = trial_started_at + the code's days (never shortens). Also
-- revives a trial that already expired, as long as the new end is still
-- in the future. One code per tenant.

create or replace function public.redeem_trial_code(p_tenant_id uuid, p_code text)
returns public.tenant
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    t public.tenant;
    granted_days integer;
    new_end timestamp with time zone;
begin
    if not public.has_tenant_role(p_tenant_id, array['admin']) then
        raise exception 'must be a tenant admin to redeem a trial code';
    end if;

    select * into t from public.tenant where id = p_tenant_id for update;

    if t.trial_status is null or t.trial_status not in ('active', 'expired') then
        raise exception 'no_trial';
    end if;

    if t.trial_code is not null then
        raise exception 'trial_code_already_applied';
    end if;

    granted_days := public.consume_trial_code(p_code);
    new_end := greatest(t.trial_ends_at, t.trial_started_at + make_interval(days => granted_days));

    if new_end <= now() then
        raise exception 'trial_code_too_short';
    end if;

    update public.tenant
    set trial_ends_at = new_end,
        trial_code = upper(btrim(p_code)),
        trial_status = 'active',
        plan = 'pro studio',
        updated_at = now()
    where id = p_tenant_id
    returning * into t;

    return t;
end;
$$;

comment on function public.redeem_trial_code(uuid, text) is 'Admin-only: applies a trial_code to the tenant''s trial, extending (or reviving) it.';

grant execute on function public.redeem_trial_code(uuid, text) to authenticated;

-- expire_due_trials: move ended trials to Starter ----------------------

create or replace function public.expire_due_trials()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    expired_count integer;
begin
    update public.tenant
    set plan = 'starter',
        trial_status = 'expired',
        updated_at = now()
    where trial_status = 'active'
      and trial_ends_at <= now();

    get diagnostics expired_count = row_count;
    return expired_count;
end;
$$;

revoke all on function public.expire_due_trials() from public, anon, authenticated;

-- Run it hourly. The app also treats an active-but-past-due trial as
-- Starter on read (api/tenant/tenant.js), so the gap between the trial
-- ending and this job firing is invisible to users.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('expire-due-trials', '0 * * * *', $$select public.expire_due_trials()$$);
