-- Phase 10: Stripe billing — data model.
--
-- Studio and Pro Studio become paid Stripe subscriptions (monthly or
-- yearly); Starter stays free. Stripe holds the money, these tables
-- only mirror it. The billing route handlers (app/api/billing/, Phase 3)
-- write here with the service role; clients can read their own billing
-- row but never write it.
--
-- For a studio with a subscription, tenant.plan is written only by
-- apply_stripe_subscription() below, called from the Stripe webhook.
-- Studios without one (Starter, on a trial, or billing_exempt) keep
-- using the existing RPCs.
--
-- Also moves every studio that sits on a paid plan without paying for
-- it back to Starter (the legacy "paid plans don't charge anything
-- today" signups). Billing-exempt studios are skipped.

begin;

-- tenant.billing_exempt ------------------------------------------------
-- Studios we bill outside Stripe or don't bill at all: our own original
-- studio, sales-led "Serious Business" deals. Set by us in the SQL
-- editor; authenticated can't touch it (014 limits their UPDATE grant
-- to name, slug, updated_at).

alter table public.tenant
    add column billing_exempt boolean not null default false;

comment on column public.tenant.billing_exempt is 'True = plan is managed by us, not Stripe. Skipped by the legacy downgrade below and rejected by apply_stripe_subscription(). Set in the SQL editor only.';

-- The original studio from 003 runs on Studio with real staff.
update public.tenant set billing_exempt = true where slug = 'default-studio';

-- tenant_billing: one row per studio that has ever started checkout ----

create table public.tenant_billing (
    tenant_id uuid primary key references public.tenant(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    -- Stripe's subscription.status, verbatim.
    status text check (status in (
        'incomplete', 'incomplete_expired', 'trialing', 'active',
        'past_due', 'canceled', 'unpaid', 'paused'
    )),
    stripe_price_id text,
    plan text check (plan in ('studio', 'pro studio')),
    billing_interval text check (billing_interval in ('month', 'year')),
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean not null default false,
    -- A downgrade waiting for the period end (Subscription Schedule).
    scheduled_plan text check (scheduled_plan in ('studio', 'pro studio')),
    scheduled_interval text check (scheduled_interval in ('month', 'year')),
    scheduled_change_at timestamp with time zone,
    -- Hosted invoice page for the open invoice while past_due ("Pay now").
    latest_invoice_url text,
    -- Display only ("Visa •••• 4242"); the card itself lives in Stripe.
    payment_method_brand text,
    payment_method_last4 text,
    -- The open Checkout session, reused so two clicks (or two admins)
    -- don't create two subscriptions.
    checkout_session_id text,
    checkout_session_expires_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

comment on table public.tenant_billing is 'Mirror of the studio''s Stripe customer + subscription. Written only by the service role (billing routes / webhook); admins can read their own row.';

alter table public.tenant_billing enable row level security;

create policy "tenant admins can select billing" on public.tenant_billing
    for select using (public.has_tenant_role(tenant_id, array['admin']));

-- stripe_event: webhook idempotency -----------------------------------
-- An event is skipped only once processed_at is set, which happens
-- after its work commits, so a crash mid-processing is retried by
-- Stripe instead of being lost.

create table public.stripe_event (
    id text primary key,
    type text not null,
    received_at timestamp with time zone not null default now(),
    processed_at timestamp with time zone,
    error text
);

comment on table public.stripe_event is 'Stripe webhook events seen. processed_at null = not yet (or not successfully) handled. Service role only.';

-- RLS on, no policies: service role only.
alter table public.stripe_event enable row level security;

-- cancellation_feedback: the optional survey after cancelling ----------
-- reason values match Stripe's subscription.cancellation_details.feedback
-- so the same answer can be stored in both places.

create table public.cancellation_feedback (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    stripe_subscription_id text,
    from_plan text check (from_plan in ('studio', 'pro studio')),
    reason text not null check (reason in (
        'too_expensive', 'missing_features', 'switched_service', 'unused',
        'too_complex', 'low_quality', 'customer_service', 'other'
    )),
    comment text check (char_length(comment) <= 2000),
    created_at timestamp with time zone not null default now()
);

comment on table public.cancellation_feedback is 'Answers to the post-cancel survey. Inserted by the billing cancel route (service role), which also copies them to Stripe.';

create index cancellation_feedback_tenant_id_idx on public.cancellation_feedback(tenant_id);

-- RLS on, no policies: written by the billing route, read by us.
alter table public.cancellation_feedback enable row level security;

-- apply_stripe_subscription: the one writer of a subscribed studio's plan
-- The webhook re-fetches the subscription from Stripe and passes its
-- current state here; billing row and tenant.plan change in one
-- transaction.
--
-- Plan rules:
--   active / past_due        → the subscribed plan (past_due keeps it
--                              through Stripe's retries)
--   trialing                 → Pro Studio until the free trial's date,
--                              whatever plan they subscribed to
--   canceled / unpaid /
--   incomplete_expired       → Starter
--   incomplete / paused      → unchanged
-- A trial that gets a subscription becomes 'converted', which
-- expire_due_trials() (011) leaves alone.

create or replace function public.apply_stripe_subscription(
    p_tenant_id uuid,
    p_customer_id text,
    p_subscription_id text,
    p_status text,
    p_price_id text,
    p_plan text,
    p_interval text,
    p_current_period_end timestamp with time zone,
    p_cancel_at_period_end boolean,
    p_scheduled_plan text default null,
    p_scheduled_interval text default null,
    p_scheduled_change_at timestamp with time zone default null,
    p_latest_invoice_url text default null
)
returns public.tenant
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    t public.tenant;
    b public.tenant_billing;
    live_statuses constant text[] := array['incomplete', 'trialing', 'active', 'past_due', 'paused'];
    new_plan text;
    new_trial_status text;
begin
    select * into t from public.tenant where id = p_tenant_id for update;
    if not found then
        raise exception 'tenant_not_found';
    end if;

    if t.billing_exempt then
        raise exception 'billing_exempt';
    end if;

    select * into b from public.tenant_billing where tenant_id = p_tenant_id;

    -- A late event about an older subscription (e.g. the one they
    -- cancelled before resubscribing) must not override the live one.
    if b.stripe_subscription_id is not null
       and b.stripe_subscription_id <> p_subscription_id
       and b.status = any (live_statuses)
       and not (p_status = any (live_statuses)) then
        return t;
    end if;

    insert into public.tenant_billing (
        tenant_id, stripe_customer_id, stripe_subscription_id, status,
        stripe_price_id, plan, billing_interval, current_period_end,
        cancel_at_period_end, scheduled_plan, scheduled_interval,
        scheduled_change_at, latest_invoice_url, updated_at
    )
    values (
        p_tenant_id, p_customer_id, p_subscription_id, p_status,
        p_price_id, p_plan, p_interval, p_current_period_end,
        coalesce(p_cancel_at_period_end, false), p_scheduled_plan,
        p_scheduled_interval, p_scheduled_change_at, p_latest_invoice_url, now()
    )
    on conflict (tenant_id) do update set
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        status = excluded.status,
        stripe_price_id = excluded.stripe_price_id,
        plan = excluded.plan,
        billing_interval = excluded.billing_interval,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        scheduled_plan = excluded.scheduled_plan,
        scheduled_interval = excluded.scheduled_interval,
        scheduled_change_at = excluded.scheduled_change_at,
        latest_invoice_url = excluded.latest_invoice_url,
        updated_at = now();

    new_trial_status := case
        when p_status in ('trialing', 'active', 'past_due') and t.trial_status = 'active' then 'converted'
        else t.trial_status
    end;

    new_plan := case
        when p_status in ('active', 'past_due') then p_plan
        when p_status = 'trialing' and new_trial_status = 'converted' then 'pro studio'
        when p_status = 'trialing' then p_plan
        when p_status in ('canceled', 'unpaid', 'incomplete_expired') then 'starter'
        else t.plan
    end;

    update public.tenant
    set plan = new_plan,
        trial_status = new_trial_status,
        updated_at = now()
    where id = p_tenant_id
    returning * into t;

    return t;
end;
$$;

comment on function public.apply_stripe_subscription(uuid, text, text, text, text, text, text, timestamp with time zone, boolean, text, text, timestamp with time zone, text) is 'Service role only (Stripe webhook): mirrors a subscription into tenant_billing and sets tenant.plan from it, atomically.';

revoke all on function public.apply_stripe_subscription(uuid, text, text, text, text, text, text, timestamp with time zone, boolean, text, text, timestamp with time zone, text) from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription(uuid, text, text, text, text, text, text, timestamp with time zone, boolean, text, text, timestamp with time zone, text) to service_role;

-- downgrade_tenant_plan: not for subscribed studios ---------------------
-- Same as 014, plus has_subscription: a studio paying through Stripe
-- changes plans through the billing routes (scheduled for the period
-- end), or the RPC and Stripe would disagree about what they pay for.

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

    if exists (
        select 1 from public.tenant_billing
        where tenant_id = p_tenant_id
          and status in ('incomplete', 'trialing', 'active', 'past_due', 'paused')
    ) then
        raise exception 'has_subscription';
    end if;

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

comment on function public.downgrade_tenant_plan(uuid, text) is 'Admin-only: moves a studio without a Stripe subscription to a lower plan; ends an active trial. Raises has_subscription for subscribed studios and not_a_downgrade for upgrades.';

-- Legacy downgrade --------------------------------------------------------
-- Settle trials that are already past their end, then move every other
-- unpaid studio on a paid plan to Starter. Active trials are left to run
-- out on their own; exempt studios are skipped.

select public.expire_due_trials();

do $$
declare
    moved integer;
begin
    update public.tenant t
    set plan = 'starter',
        updated_at = now()
    where t.plan in ('studio', 'pro studio')
      and not t.billing_exempt
      and t.trial_status is distinct from 'active'
      and not exists (
          select 1 from public.tenant_billing b
          where b.tenant_id = t.id
            and b.status in ('trialing', 'active', 'past_due')
      );

    get diagnostics moved = row_count;
    raise notice 'Moved % unpaid studio(s) to Starter', moved;
end;
$$;

commit;
