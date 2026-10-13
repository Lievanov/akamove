


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- [local only] The local Supabase grants every new public table/function to
-- anon/authenticated/service_role by default; the cloud project doesn't for the
-- objects below. This dump only records the grants that DO exist, so turn
-- the defaults off while it runs (the dump turns them back on at the end)
-- and the local permissions match the cloud project exactly.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated", "service_role";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."tenant" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "plan" "text" DEFAULT 'starter'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_status" "text",
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "trial_code" "text",
    "billing_exempt" boolean DEFAULT false NOT NULL,
    CONSTRAINT "tenant_plan_check" CHECK (("plan" = ANY (ARRAY['starter'::"text", 'studio'::"text", 'pro studio'::"text"]))),
    CONSTRAINT "tenant_trial_status_check" CHECK (("trial_status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."tenant" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant" IS 'A studio/organization. plan is data-only for now — no gating enforced.';



COMMENT ON COLUMN "public"."tenant"."trial_status" IS 'null = never trialed; active / expired / converted (converted reserved for Stripe).';



COMMENT ON COLUMN "public"."tenant"."trial_ends_at" IS 'Editable by us (SQL editor) to extend a trial by hand; admins extend it only via redeem_trial_code.';



COMMENT ON COLUMN "public"."tenant"."trial_code" IS 'The trial_code applied to this tenant, if any (one per tenant).';



COMMENT ON COLUMN "public"."tenant"."billing_exempt" IS 'True = plan is managed by us, not Stripe. Skipped by the legacy downgrade below and rejected by apply_stripe_subscription(). Set in the SQL editor only.';



CREATE OR REPLACE FUNCTION "public"."accept_pending_invites"() RETURNS SETOF "public"."tenant"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
    caller_email text;
    invite public.tenant_invite;
begin
    if auth.uid() is null then
        raise exception 'must be authenticated to accept invites';
    end if;

    select u.email into caller_email
    from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null;
    if caller_email is null then
        return;
    end if;

    for invite in
        select *
        from public.tenant_invite
        where status = 'pending'
          and lower(email) = lower(caller_email)
        order by created_at asc
    loop
        insert into public.user_tenant (user_id, tenant_id, role)
        values (auth.uid(), invite.tenant_id, invite.role)
        on conflict (user_id, tenant_id) do nothing;

        update public.tenant_invite
        set status = 'accepted', accepted_at = now()
        where id = invite.id;

        return query select * from public.tenant where id = invite.tenant_id;
    end loop;

    return;
end;
$$;


ALTER FUNCTION "public"."accept_pending_invites"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_pending_invites"() IS 'Attaches the calling user to every tenant that has a pending invite for their confirmed auth email. Called on login.';



CREATE OR REPLACE FUNCTION "public"."apply_stripe_subscription"("p_tenant_id" "uuid", "p_customer_id" "text", "p_subscription_id" "text", "p_status" "text", "p_price_id" "text", "p_plan" "text", "p_interval" "text", "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_scheduled_plan" "text" DEFAULT NULL::"text", "p_scheduled_interval" "text" DEFAULT NULL::"text", "p_scheduled_change_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_latest_invoice_url" "text" DEFAULT NULL::"text") RETURNS "public"."tenant"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."apply_stripe_subscription"("p_tenant_id" "uuid", "p_customer_id" "text", "p_subscription_id" "text", "p_status" "text", "p_price_id" "text", "p_plan" "text", "p_interval" "text", "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_scheduled_plan" "text", "p_scheduled_interval" "text", "p_scheduled_change_at" timestamp with time zone, "p_latest_invoice_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_stripe_subscription"("p_tenant_id" "uuid", "p_customer_id" "text", "p_subscription_id" "text", "p_status" "text", "p_price_id" "text", "p_plan" "text", "p_interval" "text", "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_scheduled_plan" "text", "p_scheduled_interval" "text", "p_scheduled_change_at" timestamp with time zone, "p_latest_invoice_url" "text") IS 'Service role only (Stripe webhook): mirrors a subscription into tenant_billing and sets tenant.plan from it, atomically.';



CREATE OR REPLACE FUNCTION "public"."auto_create_periods"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
    t record;
    local_today date;
    target_month date;
    source_period_id uuid;
    new_period_id uuid;
    new_prices numeric[];
    created_count integer := 0;
begin
    for t in
        select
            tenant.id,
            (cfg.value ->> 'day')::integer as run_day,
            cfg.value ->> 'name_format' as name_format,
            coalesce(nullif(tz.value #>> '{}', ''), 'America/Indiana/Indianapolis') as timezone
        from public.tenant
        join public.settings cfg
            on cfg.tenant_id = tenant.id and cfg.key = 'period_auto_create'
        left join public.settings tz
            on tz.tenant_id = tenant.id and tz.key = 'timezone'
        where (cfg.value ->> 'enabled')::boolean is true
          and tenant.plan in ('studio', 'pro studio')
          and not coalesce(tenant.trial_status = 'active' and tenant.trial_ends_at <= now(), false)
    loop
        begin
            local_today := (now() at time zone t.timezone)::date;
            if extract(day from local_today) < least(greatest(coalesce(t.run_day, 25), 1), 28) then
                continue;
            end if;

            target_month := (date_trunc('month', local_today) + interval '1 month')::date;

            -- Lock the studio's (studio, month) slot; a concurrent run waits
            -- here and then sees the row.
            perform pg_advisory_xact_lock(hashtext(t.id::text || target_month::text));
            if exists (
                select 1 from public.period_auto_run
                where tenant_id = t.id and month = target_month
            ) then
                continue;
            end if;

            if exists (
                select 1 from public.period
                where tenant_id = t.id
                  and start_date >= target_month
                  and start_date < (target_month + interval '1 month')::date
            ) then
                insert into public.period_auto_run (tenant_id, month, status)
                values (t.id, target_month, 'skipped_existing');
                continue;
            end if;

            -- Same "previous period" the New period form copies from.
            source_period_id := null;
            new_prices := null;
            select id, prices into source_period_id, new_prices
            from public.period
            where tenant_id = t.id
            order by created_at desc
            limit 1;

            if new_prices is null or cardinality(new_prices) = 0 then
                select coalesce(array_agg(p::numeric), '{}') into new_prices
                from public.settings s, jsonb_array_elements_text(
                    case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end
                ) as p
                where s.tenant_id = t.id and s.key = 'default_prices';
            end if;

            insert into public.period (tenant_id, name, start_date, end_date, prices)
            values (
                t.id,
                public.auto_period_name(target_month, t.name_format),
                target_month,
                (target_month + interval '1 month' - interval '1 day')::date,
                new_prices
            )
            returning id into new_period_id;

            if source_period_id is not null then
                insert into public.period_location_class
                    (period_id, location_id, class_id, day_of_week, class_time, sort_order, tenant_id)
                select new_period_id, location_id, class_id, day_of_week, class_time, sort_order, t.id
                from public.period_location_class
                where period_id = source_period_id;
            end if;

            insert into public.period_auto_run (tenant_id, month, period_id, status)
            values (t.id, target_month, new_period_id, 'created');

            created_count := created_count + 1;
        exception when others then
            raise warning 'auto_create_periods: tenant % failed: %', t.id, sqlerrm;
        end;
    end loop;

    return created_count;
end;
$$;


ALTER FUNCTION "public"."auto_create_periods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_create_periods"() IS 'Hourly (pg_cron): creates next month''s period for studios with period_auto_create enabled. Idempotent via period_auto_run.';



CREATE OR REPLACE FUNCTION "public"."auto_period_name"("p_month" "date", "p_format" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select case p_format
        when 'short_month_year' then to_char(p_month, 'FMMon YYYY')
        when 'year_month' then to_char(p_month, 'YYYY-MM')
        else to_char(p_month, 'FMMonth YYYY')
    end
$$;


ALTER FUNCTION "public"."auto_period_name"("p_month" "date", "p_format" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_trial_code"("p_code" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."consume_trial_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant_and_admin"("p_name" "text", "p_plan" "text" DEFAULT 'starter'::"text", "p_trial" boolean DEFAULT false, "p_trial_code" "text" DEFAULT NULL::"text") RETURNS "public"."tenant"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."create_tenant_and_admin"("p_name" "text", "p_plan" "text", "p_trial" boolean, "p_trial_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_tenant_and_admin"("p_name" "text", "p_plan" "text", "p_trial" boolean, "p_trial_code" "text") IS 'Atomically creates a tenant and makes the calling user its admin. p_trial starts a 14-day Pro Studio trial (one per user); otherwise the studio starts on Starter whatever p_plan says — paid plans come from Stripe Checkout.';



CREATE OR REPLACE FUNCTION "public"."downgrade_tenant_plan"("p_tenant_id" "uuid", "p_plan" "text") RETURNS "public"."tenant"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."downgrade_tenant_plan"("p_tenant_id" "uuid", "p_plan" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."downgrade_tenant_plan"("p_tenant_id" "uuid", "p_plan" "text") IS 'Admin-only: moves a studio without a Stripe subscription to a lower plan; ends an active trial. Raises has_subscription for subscribed studios and not_a_downgrade for upgrades.';



CREATE OR REPLACE FUNCTION "public"."expire_due_trials"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."expire_due_trials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.email, new.raw_user_meta_data->>'email')
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_tenant_role"("p_tenant_id" "uuid", "p_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.user_tenant ut
    where ut.tenant_id = p_tenant_id
      and ut.user_id = auth.uid()
      and ut.role = any (p_roles)
  );
$$;


ALTER FUNCTION "public"."has_tenant_role"("p_tenant_id" "uuid", "p_roles" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_tenant_role"("p_tenant_id" "uuid", "p_roles" "text"[]) IS 'True if the calling user has one of the given roles in the given tenant.';



CREATE OR REPLACE FUNCTION "public"."is_tenant_member"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.user_tenant ut
    where ut.tenant_id = p_tenant_id
      and ut.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_tenant_member"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_tenant_member"("p_tenant_id" "uuid") IS 'True if the calling user (auth.uid()) is a member of the given tenant.';



CREATE OR REPLACE FUNCTION "public"."plan_rank"("p_plan" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select case p_plan
        when 'starter' then 1
        when 'studio' then 2
        when 'pro studio' then 3
    end
$$;


ALTER FUNCTION "public"."plan_rank"("p_plan" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."punch_pass_check_total_entries"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
    if new.total_entries < (select count(*) from public.punch_pass_entry where punch_pass_id = new.id) then
        raise exception 'entries_below_used';
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."punch_pass_check_total_entries"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."punch_pass_entry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "punch_pass_id" "uuid" NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "class_id" "uuid",
    "location_id" "uuid",
    "notes" "text",
    "recorded_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."punch_pass_entry" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_punch"("p_student_id" "uuid", "p_used_at" timestamp with time zone DEFAULT "now"(), "p_class_id" "uuid" DEFAULT NULL::"uuid", "p_location_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."punch_pass_entry"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
    v_tenant_id uuid;
    v_timezone text;
    v_day date;
    v_pass_id uuid;
    v_entry public.punch_pass_entry;
begin
    select tenant_id into v_tenant_id from public.student where id = p_student_id;
    if v_tenant_id is null or not public.is_tenant_member(v_tenant_id) then
        raise exception 'student_not_found';
    end if;

    if p_class_id is not null and not exists (
        select 1 from public.class where id = p_class_id and tenant_id = v_tenant_id
    ) then
        raise exception 'invalid_class';
    end if;

    if p_location_id is not null and not exists (
        select 1 from public.location where id = p_location_id and tenant_id = v_tenant_id
    ) then
        raise exception 'invalid_location';
    end if;

    select nullif(btrim(value #>> '{}'), '') into v_timezone
    from public.settings
    where tenant_id = v_tenant_id and key = 'timezone';

    begin
        v_day := (coalesce(p_used_at, now()) at time zone coalesce(v_timezone, 'America/Indiana/Indianapolis'))::date;
    exception when others then
        v_day := (coalesce(p_used_at, now()) at time zone 'America/Indiana/Indianapolis')::date;
    end;

    -- Serialize punches for this student.
    perform 1 from public.punch_pass where student_id = p_student_id for update;

    select p.id into v_pass_id
    from public.punch_pass p
    where p.student_id = p_student_id
      and (p.expires_on is null or p.expires_on >= v_day)
      and (select count(*) from public.punch_pass_entry e where e.punch_pass_id = p.id) < p.total_entries
    order by p.purchased_on, p.created_at
    limit 1;

    if v_pass_id is null then
        raise exception 'no_active_pass';
    end if;

    insert into public.punch_pass_entry (tenant_id, punch_pass_id, used_at, class_id, location_id, notes, recorded_by)
    values (v_tenant_id, v_pass_id, coalesce(p_used_at, now()), p_class_id, p_location_id, nullif(btrim(p_notes), ''), auth.uid())
    returning * into v_entry;

    return v_entry;
end;
$$;


ALTER FUNCTION "public"."record_punch"("p_student_id" "uuid", "p_used_at" timestamp with time zone, "p_class_id" "uuid", "p_location_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_trial_code"("p_tenant_id" "uuid", "p_code" "text") RETURNS "public"."tenant"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."redeem_trial_code"("p_tenant_id" "uuid", "p_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."redeem_trial_code"("p_tenant_id" "uuid", "p_code" "text") IS 'Admin-only: applies a trial_code to the tenant''s trial, extending (or reviving) it.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "classes" "uuid"[] NOT NULL,
    "payment_method" "text",
    "payment_amount" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "period_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notes" "text",
    "is_dropout" boolean,
    "is_credit" boolean DEFAULT false,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."payment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."period" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "classes" "uuid"[],
    "prices" numeric[],
    "name" "text",
    "is_current" boolean,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."period" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "date_of_birth" "date",
    "email" "text",
    "phone" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "classes" "uuid"[],
    "credit" real,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "student_credit_check" CHECK (("credit" >= (0.0)::double precision))
);


ALTER TABLE "public"."student" OWNER TO "postgres";


COMMENT ON TABLE "public"."student" IS 'students table';



COMMENT ON COLUMN "public"."student"."credit" IS 'credit';



CREATE OR REPLACE VIEW "public"."active_vs_nonactive_students_view" WITH ("security_invoker"='on') AS
 WITH "latest_period" AS (
         SELECT "period"."id"
           FROM "public"."period"
          ORDER BY "period"."created_at" DESC
         LIMIT 1
        ), "active_students_latest_period" AS (
         SELECT "count"("s"."id") AS "active_students"
           FROM (("public"."student" "s"
             JOIN "public"."payment" "p" ON (("s"."id" = "p"."student_id")))
             CROSS JOIN "latest_period" "lp")
          WHERE ("p"."period_id" = "lp"."id")
        ), "total_students" AS (
         SELECT "count"(*) AS "total_students"
           FROM "public"."student"
        )
 SELECT ( SELECT "active_students_latest_period"."active_students"
           FROM "active_students_latest_period") AS "active_students",
    ( SELECT "total_students"."total_students"
           FROM "total_students") AS "total_students";


ALTER VIEW "public"."active_vs_nonactive_students_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "level" bigint,
    "order" integer,
    "class_type" integer,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."class" OWNER TO "postgres";


COMMENT ON COLUMN "public"."class"."order" IS 'class level order';



COMMENT ON COLUMN "public"."class"."class_type" IS 'bachata , salsa or any other class';



CREATE OR REPLACE VIEW "public"."all_students_by_last_payments_view" WITH ("security_invoker"='on') AS
 SELECT "s"."id",
    "s"."first_name",
    "s"."last_name",
    "concat"("s"."first_name", ' ', "s"."last_name") AS "full_name",
    "s"."phone",
    COALESCE("array_agg"("c"."id") FILTER (WHERE ("c"."id" IS NOT NULL)), ARRAY[]::"uuid"[]) AS "class_ids",
    COALESCE("array_agg"("c"."class_type") FILTER (WHERE ("c"."class_type" IS NOT NULL)), ARRAY[]::integer[]) AS "class_type",
    COALESCE("array_agg"((("c"."name" || ' '::"text") || "c"."level")) FILTER (WHERE (("c"."name" IS NOT NULL) AND ("c"."level" IS NOT NULL))), ARRAY[]::"text"[]) AS "class_info"
   FROM ((("public"."student" "s"
     LEFT JOIN ( SELECT "payment"."id",
            "payment"."student_id",
            "payment"."classes",
            "payment"."payment_method",
            "payment"."payment_amount",
            "payment"."created_at",
            "payment"."period_id",
            "payment"."notes",
            "payment"."is_dropout"
           FROM "public"."payment"
          WHERE ("payment"."period_id" = ( SELECT "period"."id"
                   FROM "public"."period"
                  ORDER BY "period"."created_at" DESC
                 LIMIT 1))) "pay" ON (("pay"."student_id" = "s"."id")))
     LEFT JOIN LATERAL "unnest"("pay"."classes") "class_id_array"("class_id_array") ON (true))
     LEFT JOIN "public"."class" "c" ON (("c"."id" = "class_id_array"."class_id_array")))
  GROUP BY "s"."id", "s"."first_name", "s"."last_name", "s"."phone";


ALTER VIEW "public"."all_students_by_last_payments_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancellation_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "stripe_subscription_id" "text",
    "from_plan" "text",
    "reason" "text" NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cancellation_feedback_comment_check" CHECK (("char_length"("comment") <= 2000)),
    CONSTRAINT "cancellation_feedback_from_plan_check" CHECK (("from_plan" = ANY (ARRAY['studio'::"text", 'pro studio'::"text"]))),
    CONSTRAINT "cancellation_feedback_reason_check" CHECK (("reason" = ANY (ARRAY['too_expensive'::"text", 'missing_features'::"text", 'switched_service'::"text", 'unused'::"text", 'too_complex'::"text", 'low_quality'::"text", 'customer_service'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."cancellation_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."cancellation_feedback" IS 'Answers to the post-cancel survey. Inserted by the billing cancel route (service role), which also copies them to Stripe.';



CREATE OR REPLACE VIEW "public"."class_period_student_count" AS
SELECT
    NULL::"uuid" AS "period_id",
    NULL::"date" AS "start_date",
    NULL::"date" AS "end_date",
    NULL::"uuid" AS "class_id",
    NULL::integer AS "class_type",
    NULL::"text" AS "class_info",
    NULL::bigint AS "student_count",
    NULL::numeric AS "total_payment";


ALTER VIEW "public"."class_period_student_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_type" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."class_type" OWNER TO "postgres";


ALTER TABLE "public"."class_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."class_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."classes_by_student_view" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "first_name",
    NULL::"text" AS "last_name",
    NULL::"text" AS "phone",
    NULL::timestamp with time zone AS "created_at",
    NULL::integer AS "class_type",
    NULL::"text" AS "class_info",
    NULL::"uuid" AS "class_id",
    NULL::"uuid" AS "period_id",
    NULL::"text" AS "period_name";


ALTER VIEW "public"."classes_by_student_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_payment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_amount" numeric NOT NULL,
    "client_name" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."event_payment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "event_price" numeric NOT NULL,
    "date_of_event_price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."filtered_payment_view" WITH ("security_invoker"='on') AS
 SELECT "p"."id",
    "p"."student_id",
    "p"."classes",
    "p"."payment_method",
    "p"."payment_amount",
    "p"."created_at",
    "p"."period_id",
    "p"."notes",
    "p"."is_dropout",
    "p"."is_credit",
    "s"."first_name",
    "s"."last_name",
    "s"."phone",
    "per"."name" AS "period_name",
    "per"."start_date" AS "start_period_date",
    "per"."end_date" AS "end_period_date"
   FROM (("public"."payment" "p"
     LEFT JOIN "public"."student" "s" ON (("s"."id" = "p"."student_id")))
     LEFT JOIN "public"."period" "per" ON (("per"."id" = "p"."period_id")));


ALTER VIEW "public"."filtered_payment_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."instructors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "phone" "text",
    "capacity" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."location" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "user_id" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."payment_by_student_view" WITH ("security_invoker"='on') AS
 SELECT "pay"."id",
    "per"."start_date",
    "per"."end_date",
    "per"."name" AS "period_name",
    "per"."created_at" AS "period_created_at",
    "pay"."student_id",
    "pay"."payment_method",
    "pay"."payment_amount",
    "pay"."classes" AS "payment_classes",
    "pay"."created_at",
    "array_agg"("c"."class_type") AS "class_type",
    "array_agg"((("c"."name" || ' '::"text") || "c"."level")) AS "class_info"
   FROM ((("public"."payment" "pay"
     JOIN "public"."period" "per" ON (("per"."id" = "pay"."period_id")))
     LEFT JOIN LATERAL "unnest"("pay"."classes") "class_id_array"("class_id_array") ON (true))
     FULL JOIN "public"."class" "c" ON (("c"."id" = "class_id_array"."class_id_array")))
  GROUP BY "pay"."id", "per"."start_date", "per"."end_date", "per"."name", "per"."created_at", "pay"."student_id", "pay"."created_at", "pay"."payment_method", "pay"."payment_amount", "pay"."classes"
  ORDER BY "per"."created_at" DESC;


ALTER VIEW "public"."payment_by_student_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."period_auto_run" (
    "tenant_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "period_id" "uuid",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "period_auto_run_month_check" CHECK (("month" = ("date_trunc"('month'::"text", ("month")::timestamp with time zone))::"date")),
    CONSTRAINT "period_auto_run_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'skipped_existing'::"text"])))
);


ALTER TABLE "public"."period_auto_run" OWNER TO "postgres";


COMMENT ON TABLE "public"."period_auto_run" IS 'One row per studio and month that auto_create_periods() handled. Written only by that function; staff dismiss the dashboard notice by setting reviewed_at.';



COMMENT ON COLUMN "public"."period_auto_run"."month" IS 'First day of the month the period covers.';



COMMENT ON COLUMN "public"."period_auto_run"."reviewed_at" IS 'Set when staff dismiss the "period created automatically" notice.';



CREATE TABLE IF NOT EXISTS "public"."period_location_class" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "day_of_week" "text" NOT NULL,
    "class_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."period_location_class" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_lesson_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "private_lesson_id" "uuid",
    "instructor_id" "uuid",
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."private_lesson_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "instructor_id" "uuid",
    "lessons_used" integer DEFAULT 0 NOT NULL,
    "lessons_purchased" integer NOT NULL,
    "date_purchased" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."private_lessons" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."private_lessons_view" WITH ("security_invoker"='on') AS
 SELECT "pl"."id",
    "pl"."student_id",
    "pl"."instructor_id",
    "pl"."lessons_purchased",
    "pl"."lessons_used",
    "pl"."date_purchased",
    "pl"."amount",
    "pl"."is_active",
    "s"."first_name",
    "s"."last_name",
    "i"."name" AS "instructor_name"
   FROM (("public"."private_lessons" "pl"
     LEFT JOIN "public"."student" "s" ON (("s"."id" = "pl"."student_id")))
     LEFT JOIN "public"."instructors" "i" ON (("i"."id" = "pl"."instructor_id")));


ALTER VIEW "public"."private_lessons_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text",
    "push_token" "text",
    "tours_seen" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."tours_seen" IS 'Ids of dashboard page tours this user has finished or skipped.';



CREATE TABLE IF NOT EXISTS "public"."punch_pass" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "pass_type_id" "uuid",
    "name" "text" NOT NULL,
    "total_entries" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "payment_method" "text",
    "purchased_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expires_on" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    CONSTRAINT "punch_pass_expiry_after_purchase" CHECK ((("expires_on" IS NULL) OR ("expires_on" >= "purchased_on"))),
    CONSTRAINT "punch_pass_name_check" CHECK (("btrim"("name") <> ''::"text")),
    CONSTRAINT "punch_pass_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "punch_pass_total_entries_check" CHECK (("total_entries" > 0))
);


ALTER TABLE "public"."punch_pass" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."punch_pass_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "total_entries" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "validity_days" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "punch_pass_type_name_check" CHECK (("btrim"("name") <> ''::"text")),
    CONSTRAINT "punch_pass_type_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "punch_pass_type_total_entries_check" CHECK (("total_entries" > 0)),
    CONSTRAINT "punch_pass_type_validity_days_check" CHECK (("validity_days" > 0))
);


ALTER TABLE "public"."punch_pass_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_event" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "error" "text"
);


ALTER TABLE "public"."stripe_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_event" IS 'Stripe webhook events seen. processed_at null = not yet (or not successfully) handled. Service role only.';



CREATE OR REPLACE VIEW "public"."student_count_by_period_id" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "period_id",
    "p"."start_date",
    "p"."end_date",
    "count"(DISTINCT "pm"."student_id") AS "student_count"
   FROM ("public"."period" "p"
     LEFT JOIN "public"."payment" "pm" ON (("p"."id" = "pm"."period_id")))
  GROUP BY "p"."id", "p"."start_date", "p"."end_date"
  ORDER BY "p"."start_date";


ALTER VIEW "public"."student_count_by_period_id" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."student_credit_balance" AS
 SELECT "student_id",
    "sum"("payment_amount") AS "credit_balance"
   FROM "public"."payment"
  WHERE ("is_credit" = true)
  GROUP BY "student_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."student_credit_balance" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."students_by_last_payments_view" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "first_name",
    NULL::"text" AS "last_name",
    NULL::"text" AS "phone",
    NULL::"text" AS "payment_method",
    NULL::timestamp with time zone AS "created_at",
    NULL::integer[] AS "class_type",
    NULL::"text"[] AS "class_info";


ALTER VIEW "public"."students_by_last_payments_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_billing" (
    "tenant_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text",
    "stripe_price_id" "text",
    "plan" "text",
    "billing_interval" "text",
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "scheduled_plan" "text",
    "scheduled_interval" "text",
    "scheduled_change_at" timestamp with time zone,
    "latest_invoice_url" "text",
    "payment_method_brand" "text",
    "payment_method_last4" "text",
    "checkout_session_id" "text",
    "checkout_session_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_billing_billing_interval_check" CHECK (("billing_interval" = ANY (ARRAY['month'::"text", 'year'::"text"]))),
    CONSTRAINT "tenant_billing_plan_check" CHECK (("plan" = ANY (ARRAY['studio'::"text", 'pro studio'::"text"]))),
    CONSTRAINT "tenant_billing_scheduled_interval_check" CHECK (("scheduled_interval" = ANY (ARRAY['month'::"text", 'year'::"text"]))),
    CONSTRAINT "tenant_billing_scheduled_plan_check" CHECK (("scheduled_plan" = ANY (ARRAY['studio'::"text", 'pro studio'::"text"]))),
    CONSTRAINT "tenant_billing_status_check" CHECK (("status" = ANY (ARRAY['incomplete'::"text", 'incomplete_expired'::"text", 'trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'unpaid'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."tenant_billing" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_billing" IS 'Mirror of the studio''s Stripe customer + subscription. Written only by the service role (billing routes / webhook); admins can read their own row.';



CREATE TABLE IF NOT EXISTS "public"."tenant_invite" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "invited_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "tenant_invite_role_check" CHECK (("role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))),
    CONSTRAINT "tenant_invite_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."tenant_invite" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_invite" IS 'Pending email invites. Auto-accepted on first matching login (see accept_pending_invite RPC, Phase 4).';



CREATE TABLE IF NOT EXISTS "public"."trial_code" (
    "code" "text" NOT NULL,
    "trial_days" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "max_redemptions" integer,
    "redemption_count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trial_code_code_check" CHECK (("code" = "upper"("btrim"("code")))),
    CONSTRAINT "trial_code_max_redemptions_check" CHECK (("max_redemptions" > 0)),
    CONSTRAINT "trial_code_trial_days_check" CHECK (("trial_days" > 0))
);


ALTER TABLE "public"."trial_code" OWNER TO "postgres";


COMMENT ON TABLE "public"."trial_code" IS 'Trial-length codes (e.g. 60 days). Managed by us in the SQL editor; no client access. max_redemptions / expires_at null = unlimited.';



CREATE TABLE IF NOT EXISTS "public"."trial_usage" (
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trial_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."trial_usage" IS 'Users who have started a free trial. Primary key enforces one trial per user, even if they create another studio.';



CREATE TABLE IF NOT EXISTS "public"."user_credit_balances" (
    "student_id" "uuid" NOT NULL,
    "total_credit" numeric DEFAULT 0,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."user_credit_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_tenant" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_tenant_role_check" CHECK (("role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_tenant" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_tenant" IS 'Per-tenant membership + role. Source of truth for admin/staff, replacing profiles.role.';



ALTER TABLE ONLY "public"."period"
    ADD CONSTRAINT "Period_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancellation_feedback"
    ADD CONSTRAINT "cancellation_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_type"
    ADD CONSTRAINT "class_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_payment"
    ADD CONSTRAINT "event_payment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location"
    ADD CONSTRAINT "location_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."period_auto_run"
    ADD CONSTRAINT "period_auto_run_pkey" PRIMARY KEY ("tenant_id", "month");



ALTER TABLE ONLY "public"."period_location_class"
    ADD CONSTRAINT "period_location_class_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_lesson_logs"
    ADD CONSTRAINT "private_lesson_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_lessons"
    ADD CONSTRAINT "private_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."punch_pass_entry"
    ADD CONSTRAINT "punch_pass_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."punch_pass"
    ADD CONSTRAINT "punch_pass_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."punch_pass_type"
    ADD CONSTRAINT "punch_pass_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("tenant_id", "key");



ALTER TABLE ONLY "public"."stripe_event"
    ADD CONSTRAINT "stripe_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_billing"
    ADD CONSTRAINT "tenant_billing_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenant_billing"
    ADD CONSTRAINT "tenant_billing_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."tenant_billing"
    ADD CONSTRAINT "tenant_billing_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."tenant_invite"
    ADD CONSTRAINT "tenant_invite_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant"
    ADD CONSTRAINT "tenant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant"
    ADD CONSTRAINT "tenant_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."trial_code"
    ADD CONSTRAINT "trial_code_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."trial_usage"
    ADD CONSTRAINT "trial_usage_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_credit_balances"
    ADD CONSTRAINT "user_credit_balances_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."user_tenant"
    ADD CONSTRAINT "user_tenant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tenant"
    ADD CONSTRAINT "user_tenant_user_id_tenant_id_key" UNIQUE ("user_id", "tenant_id");



CREATE INDEX "cancellation_feedback_tenant_id_idx" ON "public"."cancellation_feedback" USING "btree" ("tenant_id");



CREATE INDEX "class_tenant_id_idx" ON "public"."class" USING "btree" ("tenant_id");



CREATE INDEX "class_type_tenant_id_idx" ON "public"."class_type" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "class_type_tenant_name_key" ON "public"."class_type" USING "btree" ("tenant_id", "lower"("btrim"("name")));



CREATE INDEX "event_payment_tenant_id_idx" ON "public"."event_payment" USING "btree" ("tenant_id");



CREATE INDEX "events_tenant_id_idx" ON "public"."events" USING "btree" ("tenant_id");



CREATE INDEX "instructors_tenant_id_idx" ON "public"."instructors" USING "btree" ("tenant_id");



CREATE INDEX "location_tenant_id_idx" ON "public"."location" USING "btree" ("tenant_id");



CREATE INDEX "notes_tenant_id_idx" ON "public"."notes" USING "btree" ("tenant_id");



CREATE INDEX "payment_tenant_id_idx" ON "public"."payment" USING "btree" ("tenant_id");



CREATE INDEX "period_location_class_tenant_id_idx" ON "public"."period_location_class" USING "btree" ("tenant_id");



CREATE INDEX "period_tenant_id_idx" ON "public"."period" USING "btree" ("tenant_id");



CREATE INDEX "private_lesson_logs_tenant_id_idx" ON "public"."private_lesson_logs" USING "btree" ("tenant_id");



CREATE INDEX "private_lessons_tenant_id_idx" ON "public"."private_lessons" USING "btree" ("tenant_id");



CREATE INDEX "punch_pass_entry_punch_pass_id_idx" ON "public"."punch_pass_entry" USING "btree" ("punch_pass_id");



CREATE INDEX "punch_pass_entry_tenant_id_idx" ON "public"."punch_pass_entry" USING "btree" ("tenant_id");



CREATE INDEX "punch_pass_student_id_idx" ON "public"."punch_pass" USING "btree" ("student_id");



CREATE INDEX "punch_pass_tenant_id_idx" ON "public"."punch_pass" USING "btree" ("tenant_id");



CREATE INDEX "punch_pass_tenant_purchased_on_idx" ON "public"."punch_pass" USING "btree" ("tenant_id", "purchased_on");



CREATE INDEX "punch_pass_type_tenant_id_idx" ON "public"."punch_pass_type" USING "btree" ("tenant_id");



CREATE INDEX "settings_tenant_id_idx" ON "public"."settings" USING "btree" ("tenant_id");



CREATE INDEX "student_tenant_id_idx" ON "public"."student" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "tenant_invite_pending_email_idx" ON "public"."tenant_invite" USING "btree" ("tenant_id", "lower"("email")) WHERE ("status" = 'pending'::"text");



CREATE INDEX "tenant_invite_tenant_id_idx" ON "public"."tenant_invite" USING "btree" ("tenant_id");



CREATE INDEX "tenant_trial_active_idx" ON "public"."tenant" USING "btree" ("trial_ends_at") WHERE ("trial_status" = 'active'::"text");



CREATE INDEX "user_credit_balances_tenant_id_idx" ON "public"."user_credit_balances" USING "btree" ("tenant_id");



CREATE INDEX "user_tenant_tenant_id_idx" ON "public"."user_tenant" USING "btree" ("tenant_id");



CREATE INDEX "user_tenant_user_id_idx" ON "public"."user_tenant" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."class_period_student_count" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "period_id",
    "p"."start_date",
    "p"."end_date",
    "c"."id" AS "class_id",
    "c"."class_type",
    (("c"."name" || ' '::"text") || "c"."level") AS "class_info",
    "count"(DISTINCT "pm"."student_id") AS "student_count",
    "sum"("pm"."payment_amount") AS "total_payment"
   FROM (("public"."period" "p"
     CROSS JOIN "public"."class" "c")
     JOIN "public"."payment" "pm" ON ((("p"."id" = "pm"."period_id") AND ("c"."id" = ANY ("pm"."classes")))))
  GROUP BY "p"."id", "p"."start_date", "p"."end_date", "c"."id", "c"."name", "c"."class_type"
 HAVING ("count"(DISTINCT "pm"."student_id") > 0)
  ORDER BY "p"."start_date", "c"."name";



CREATE OR REPLACE VIEW "public"."classes_by_student_view" WITH ("security_invoker"='on') AS
 SELECT "s"."id",
    "s"."first_name",
    "s"."last_name",
    "s"."phone",
    "s"."created_at",
    "c"."class_type",
    (("c"."name" || ' '::"text") || "c"."level") AS "class_info",
    "class_id_array"."class_id_array" AS "class_id",
    "per"."id" AS "period_id",
    "per"."name" AS "period_name"
   FROM (((("public"."student" "s"
     JOIN "public"."payment" "pay" ON (("s"."id" = "pay"."student_id")))
     JOIN LATERAL "unnest"("pay"."classes") "class_id_array"("class_id_array") ON (true))
     JOIN "public"."class" "c" ON (("c"."id" = "class_id_array"."class_id_array")))
     JOIN "public"."period" "per" ON (("per"."id" = "pay"."period_id")))
  GROUP BY "s"."id", "s"."first_name", "s"."last_name", "c"."class_type", (("c"."name" || ' '::"text") || "c"."level"), "class_id_array"."class_id_array", "per"."id", "per"."name";



CREATE OR REPLACE VIEW "public"."students_by_last_payments_view" WITH ("security_invoker"='on') AS
 SELECT "s"."id",
    "s"."first_name",
    "s"."last_name",
    "s"."phone",
    "pay"."payment_method",
    "s"."created_at",
    "array_agg"("c"."class_type") AS "class_type",
    "array_agg"((("c"."name" || ' '::"text") || "c"."level")) AS "class_info"
   FROM (((("public"."student" "s"
     JOIN "public"."payment" "pay" ON (("s"."id" = "pay"."student_id")))
     JOIN LATERAL "unnest"("pay"."classes") "class_id_array"("class_id_array") ON (true))
     JOIN "public"."class" "c" ON (("c"."id" = "class_id_array"."class_id_array")))
     JOIN "public"."period" "per" ON ((("per"."id" = "pay"."period_id") AND ("per"."end_date" = ( SELECT "max"("period"."end_date") AS "max"
           FROM "public"."period")))))
  GROUP BY "s"."id", "s"."first_name", "s"."last_name", "pay"."payment_method";



CREATE OR REPLACE TRIGGER "punch_pass_check_total_entries" BEFORE UPDATE OF "total_entries" ON "public"."punch_pass" FOR EACH ROW EXECUTE FUNCTION "public"."punch_pass_check_total_entries"();



ALTER TABLE ONLY "public"."cancellation_feedback"
    ADD CONSTRAINT "cancellation_feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancellation_feedback"
    ADD CONSTRAINT "cancellation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class"
    ADD CONSTRAINT "class_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."class_type"
    ADD CONSTRAINT "class_type_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."event_payment"
    ADD CONSTRAINT "event_payment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_payment"
    ADD CONSTRAINT "event_payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_payment"
    ADD CONSTRAINT "event_payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."location"
    ADD CONSTRAINT "location_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."period"("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_studentId_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."period_auto_run"
    ADD CONSTRAINT "period_auto_run_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."period"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."period_auto_run"
    ADD CONSTRAINT "period_auto_run_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."period_location_class"
    ADD CONSTRAINT "period_location_class_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."period_location_class"
    ADD CONSTRAINT "period_location_class_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."period_location_class"
    ADD CONSTRAINT "period_location_class_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."period"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."period_location_class"
    ADD CONSTRAINT "period_location_class_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."period"
    ADD CONSTRAINT "period_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."private_lesson_logs"
    ADD CONSTRAINT "private_lesson_logs_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id");



ALTER TABLE ONLY "public"."private_lesson_logs"
    ADD CONSTRAINT "private_lesson_logs_private_lesson_id_fkey" FOREIGN KEY ("private_lesson_id") REFERENCES "public"."private_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_lesson_logs"
    ADD CONSTRAINT "private_lesson_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."private_lessons"
    ADD CONSTRAINT "private_lessons_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id");



ALTER TABLE ONLY "public"."private_lessons"
    ADD CONSTRAINT "private_lessons_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."private_lessons"
    ADD CONSTRAINT "private_lessons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."punch_pass"
    ADD CONSTRAINT "punch_pass_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."punch_pass_entry"
    ADD CONSTRAINT "punch_pass_entry_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."punch_pass_entry"
    ADD CONSTRAINT "punch_pass_entry_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."punch_pass_entry"
    ADD CONSTRAINT "punch_pass_entry_punch_pass_id_fkey" FOREIGN KEY ("punch_pass_id") REFERENCES "public"."punch_pass"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."punch_pass_entry"
    ADD CONSTRAINT "punch_pass_entry_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."punch_pass_entry"
    ADD CONSTRAINT "punch_pass_entry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."punch_pass"
    ADD CONSTRAINT "punch_pass_pass_type_id_fkey" FOREIGN KEY ("pass_type_id") REFERENCES "public"."punch_pass_type"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."punch_pass"
    ADD CONSTRAINT "punch_pass_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."punch_pass"
    ADD CONSTRAINT "punch_pass_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."punch_pass_type"
    ADD CONSTRAINT "punch_pass_type_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."tenant_billing"
    ADD CONSTRAINT "tenant_billing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invite"
    ADD CONSTRAINT "tenant_invite_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_invite"
    ADD CONSTRAINT "tenant_invite_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trial_usage"
    ADD CONSTRAINT "trial_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trial_usage"
    ADD CONSTRAINT "trial_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credit_balances"
    ADD CONSTRAINT "user_credit_balances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id");



ALTER TABLE ONLY "public"."user_credit_balances"
    ADD CONSTRAINT "user_credit_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id");



ALTER TABLE ONLY "public"."user_tenant"
    ADD CONSTRAINT "user_tenant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tenant"
    ADD CONSTRAINT "user_tenant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow read access to own credit balance" ON "public"."user_credit_balances" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."student"
  WHERE (("student"."id" = "user_credit_balances"."student_id") AND ("student"."id" = "auth"."uid"())))));



CREATE POLICY "Allow update of own credit balance" ON "public"."user_credit_balances" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."student"
  WHERE (("student"."id" = "user_credit_balances"."student_id") AND ("student"."id" = "auth"."uid"())))));



CREATE POLICY "Enable insert for all users" ON "public"."payment" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."payment" FOR SELECT USING (true);



CREATE POLICY "Enable update for users" ON "public"."payment" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."cancellation_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_payment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."instructors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."period" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."period_auto_run" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."period_location_class" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_lesson_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."punch_pass" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."punch_pass_entry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."punch_pass_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select own or as tenant admin" ON "public"."user_tenant" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])));



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant admins can select billing" ON "public"."tenant_billing" FOR SELECT USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins can update tenant" ON "public"."tenant" FOR UPDATE USING ("public"."has_tenant_role"("id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins delete" ON "public"."location" FOR DELETE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins delete" ON "public"."period_location_class" FOR DELETE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins delete" ON "public"."punch_pass" FOR DELETE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins delete" ON "public"."punch_pass_type" FOR DELETE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins insert" ON "public"."location" FOR INSERT WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins insert" ON "public"."period_location_class" FOR INSERT WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins insert" ON "public"."punch_pass_type" FOR INSERT WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins insert" ON "public"."settings" FOR INSERT WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins manage invites" ON "public"."tenant_invite" USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins manage members" ON "public"."user_tenant" USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins select" ON "public"."settings" FOR SELECT USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins update" ON "public"."location" FOR UPDATE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins update" ON "public"."period_location_class" FOR UPDATE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins update" ON "public"."punch_pass_type" FOR UPDATE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant admins update" ON "public"."settings" FOR UPDATE USING ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"])) WITH CHECK ("public"."has_tenant_role"("tenant_id", ARRAY['admin'::"text"]));



CREATE POLICY "tenant members can select tenant" ON "public"."tenant" FOR SELECT USING ("public"."is_tenant_member"("id"));



CREATE POLICY "tenant members delete" ON "public"."class" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members delete" ON "public"."event_payment" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members delete" ON "public"."events" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members delete" ON "public"."instructors" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members delete" ON "public"."notes" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members delete" ON "public"."private_lessons" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members delete" ON "public"."punch_pass_entry" FOR DELETE USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."class" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."class_type" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."event_payment" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."events" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."instructors" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."notes" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."payment" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."period" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."private_lesson_logs" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."private_lessons" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."punch_pass" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members insert" ON "public"."student" FOR INSERT WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."class" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."class_type" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."event_payment" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."events" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."instructors" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."location" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."notes" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."payment" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."period" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."period_auto_run" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."period_location_class" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."private_lesson_logs" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."private_lessons" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."punch_pass" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."punch_pass_entry" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."punch_pass_type" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."student" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members select" ON "public"."user_credit_balances" FOR SELECT USING ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."class" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."event_payment" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."events" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."instructors" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."notes" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."payment" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."period" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."period_auto_run" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."private_lessons" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."punch_pass" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."punch_pass_entry" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."student" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



CREATE POLICY "tenant members update" ON "public"."user_credit_balances" FOR UPDATE USING ("public"."is_tenant_member"("tenant_id")) WITH CHECK ("public"."is_tenant_member"("tenant_id"));



ALTER TABLE "public"."tenant_billing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_invite" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trial_code" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trial_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_credit_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_tenant" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can see own trial usage" ON "public"."trial_usage" FOR SELECT USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON TABLE "public"."tenant" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tenant" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."tenant" TO "authenticated";



GRANT UPDATE("slug") ON TABLE "public"."tenant" TO "authenticated";



GRANT UPDATE("updated_at") ON TABLE "public"."tenant" TO "authenticated";



GRANT ALL ON FUNCTION "public"."accept_pending_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."accept_pending_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_pending_invites"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_stripe_subscription"("p_tenant_id" "uuid", "p_customer_id" "text", "p_subscription_id" "text", "p_status" "text", "p_price_id" "text", "p_plan" "text", "p_interval" "text", "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_scheduled_plan" "text", "p_scheduled_interval" "text", "p_scheduled_change_at" timestamp with time zone, "p_latest_invoice_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_stripe_subscription"("p_tenant_id" "uuid", "p_customer_id" "text", "p_subscription_id" "text", "p_status" "text", "p_price_id" "text", "p_plan" "text", "p_interval" "text", "p_current_period_end" timestamp with time zone, "p_cancel_at_period_end" boolean, "p_scheduled_plan" "text", "p_scheduled_interval" "text", "p_scheduled_change_at" timestamp with time zone, "p_latest_invoice_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_create_periods"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_create_periods"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_period_name"("p_month" "date", "p_format" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_period_name"("p_month" "date", "p_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_period_name"("p_month" "date", "p_format" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_trial_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_trial_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant_and_admin"("p_name" "text", "p_plan" "text", "p_trial" boolean, "p_trial_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant_and_admin"("p_name" "text", "p_plan" "text", "p_trial" boolean, "p_trial_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant_and_admin"("p_name" "text", "p_plan" "text", "p_trial" boolean, "p_trial_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."downgrade_tenant_plan"("p_tenant_id" "uuid", "p_plan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."downgrade_tenant_plan"("p_tenant_id" "uuid", "p_plan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."downgrade_tenant_plan"("p_tenant_id" "uuid", "p_plan" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_due_trials"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_due_trials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_tenant_role"("p_tenant_id" "uuid", "p_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_tenant_role"("p_tenant_id" "uuid", "p_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_tenant_role"("p_tenant_id" "uuid", "p_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_tenant_member"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_tenant_member"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_tenant_member"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."plan_rank"("p_plan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."plan_rank"("p_plan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_rank"("p_plan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."punch_pass_check_total_entries"() TO "anon";
GRANT ALL ON FUNCTION "public"."punch_pass_check_total_entries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."punch_pass_check_total_entries"() TO "service_role";



GRANT ALL ON TABLE "public"."punch_pass_entry" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."punch_pass_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."punch_pass_entry" TO "service_role";



GRANT UPDATE("used_at") ON TABLE "public"."punch_pass_entry" TO "authenticated";



GRANT UPDATE("class_id") ON TABLE "public"."punch_pass_entry" TO "authenticated";



GRANT UPDATE("location_id") ON TABLE "public"."punch_pass_entry" TO "authenticated";



GRANT UPDATE("notes") ON TABLE "public"."punch_pass_entry" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."record_punch"("p_student_id" "uuid", "p_used_at" timestamp with time zone, "p_class_id" "uuid", "p_location_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_punch"("p_student_id" "uuid", "p_used_at" timestamp with time zone, "p_class_id" "uuid", "p_location_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_punch"("p_student_id" "uuid", "p_used_at" timestamp with time zone, "p_class_id" "uuid", "p_location_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_trial_code"("p_tenant_id" "uuid", "p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_trial_code"("p_tenant_id" "uuid", "p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_trial_code"("p_tenant_id" "uuid", "p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";
























GRANT ALL ON TABLE "public"."payment" TO "anon";
GRANT ALL ON TABLE "public"."payment" TO "authenticated";
GRANT ALL ON TABLE "public"."payment" TO "service_role";



GRANT ALL ON TABLE "public"."period" TO "anon";
GRANT ALL ON TABLE "public"."period" TO "authenticated";
GRANT ALL ON TABLE "public"."period" TO "service_role";



GRANT ALL ON TABLE "public"."student" TO "anon";
GRANT ALL ON TABLE "public"."student" TO "authenticated";
GRANT ALL ON TABLE "public"."student" TO "service_role";



GRANT ALL ON TABLE "public"."active_vs_nonactive_students_view" TO "anon";
GRANT ALL ON TABLE "public"."active_vs_nonactive_students_view" TO "authenticated";
GRANT ALL ON TABLE "public"."active_vs_nonactive_students_view" TO "service_role";



GRANT ALL ON TABLE "public"."class" TO "anon";
GRANT ALL ON TABLE "public"."class" TO "authenticated";
GRANT ALL ON TABLE "public"."class" TO "service_role";



GRANT ALL ON TABLE "public"."all_students_by_last_payments_view" TO "anon";
GRANT ALL ON TABLE "public"."all_students_by_last_payments_view" TO "authenticated";
GRANT ALL ON TABLE "public"."all_students_by_last_payments_view" TO "service_role";



GRANT ALL ON TABLE "public"."cancellation_feedback" TO "anon";
GRANT ALL ON TABLE "public"."cancellation_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."cancellation_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."class_period_student_count" TO "anon";
GRANT ALL ON TABLE "public"."class_period_student_count" TO "authenticated";
GRANT ALL ON TABLE "public"."class_period_student_count" TO "service_role";



GRANT ALL ON TABLE "public"."class_type" TO "anon";
GRANT ALL ON TABLE "public"."class_type" TO "authenticated";
GRANT ALL ON TABLE "public"."class_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."class_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."class_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."class_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."classes_by_student_view" TO "anon";
GRANT ALL ON TABLE "public"."classes_by_student_view" TO "authenticated";
GRANT ALL ON TABLE "public"."classes_by_student_view" TO "service_role";



GRANT ALL ON TABLE "public"."deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."event_payment" TO "anon";
GRANT ALL ON TABLE "public"."event_payment" TO "authenticated";
GRANT ALL ON TABLE "public"."event_payment" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."filtered_payment_view" TO "anon";
GRANT ALL ON TABLE "public"."filtered_payment_view" TO "authenticated";
GRANT ALL ON TABLE "public"."filtered_payment_view" TO "service_role";



GRANT ALL ON TABLE "public"."instructors" TO "anon";
GRANT ALL ON TABLE "public"."instructors" TO "authenticated";
GRANT ALL ON TABLE "public"."instructors" TO "service_role";



GRANT ALL ON TABLE "public"."location" TO "anon";
GRANT ALL ON TABLE "public"."location" TO "authenticated";
GRANT ALL ON TABLE "public"."location" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."payment_by_student_view" TO "anon";
GRANT ALL ON TABLE "public"."payment_by_student_view" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_by_student_view" TO "service_role";



GRANT ALL ON TABLE "public"."period_auto_run" TO "service_role";
GRANT SELECT ON TABLE "public"."period_auto_run" TO "authenticated";



GRANT UPDATE("reviewed_at") ON TABLE "public"."period_auto_run" TO "authenticated";



GRANT ALL ON TABLE "public"."period_location_class" TO "anon";
GRANT ALL ON TABLE "public"."period_location_class" TO "authenticated";
GRANT ALL ON TABLE "public"."period_location_class" TO "service_role";



GRANT ALL ON TABLE "public"."private_lesson_logs" TO "anon";
GRANT ALL ON TABLE "public"."private_lesson_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."private_lesson_logs" TO "service_role";



GRANT ALL ON TABLE "public"."private_lessons" TO "anon";
GRANT ALL ON TABLE "public"."private_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."private_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."private_lessons_view" TO "anon";
GRANT ALL ON TABLE "public"."private_lessons_view" TO "authenticated";
GRANT ALL ON TABLE "public"."private_lessons_view" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."punch_pass" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."punch_pass" TO "authenticated";
GRANT ALL ON TABLE "public"."punch_pass" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT UPDATE("total_entries") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT UPDATE("price") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT UPDATE("payment_method") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT UPDATE("purchased_on") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT UPDATE("expires_on") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT UPDATE("notes") ON TABLE "public"."punch_pass" TO "authenticated";



GRANT ALL ON TABLE "public"."punch_pass_type" TO "anon";
GRANT ALL ON TABLE "public"."punch_pass_type" TO "authenticated";
GRANT ALL ON TABLE "public"."punch_pass_type" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_event" TO "anon";
GRANT ALL ON TABLE "public"."stripe_event" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_event" TO "service_role";



GRANT ALL ON TABLE "public"."student_count_by_period_id" TO "anon";
GRANT ALL ON TABLE "public"."student_count_by_period_id" TO "authenticated";
GRANT ALL ON TABLE "public"."student_count_by_period_id" TO "service_role";



GRANT ALL ON TABLE "public"."student_credit_balance" TO "anon";
GRANT ALL ON TABLE "public"."student_credit_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."student_credit_balance" TO "service_role";



GRANT ALL ON TABLE "public"."students_by_last_payments_view" TO "anon";
GRANT ALL ON TABLE "public"."students_by_last_payments_view" TO "authenticated";
GRANT ALL ON TABLE "public"."students_by_last_payments_view" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_billing" TO "anon";
GRANT ALL ON TABLE "public"."tenant_billing" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_billing" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invite" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invite" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invite" TO "service_role";



GRANT ALL ON TABLE "public"."trial_code" TO "anon";
GRANT ALL ON TABLE "public"."trial_code" TO "authenticated";
GRANT ALL ON TABLE "public"."trial_code" TO "service_role";



GRANT ALL ON TABLE "public"."trial_usage" TO "anon";
GRANT ALL ON TABLE "public"."trial_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."trial_usage" TO "service_role";



GRANT ALL ON TABLE "public"."user_credit_balances" TO "anon";
GRANT ALL ON TABLE "public"."user_credit_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."user_credit_balances" TO "service_role";



GRANT ALL ON TABLE "public"."user_tenant" TO "anon";
GRANT ALL ON TABLE "public"."user_tenant" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tenant" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































