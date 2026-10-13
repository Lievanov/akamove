-- Phase 13: automatic monthly periods (backlog 002).
--
-- Studios that run the same classes every month use periods only to track
-- monthly payments. With auto-create on (Settings → Automatic Monthly
-- Periods), an hourly job creates next month's period for them.
--
-- Settings (`settings.key = 'period_auto_create'`, written by the app):
--   { "enabled": true, "day": 25, "name_format": "month_year" }
--   day          1–28, in the studio's timezone (`settings.timezone`).
--                On or after that day, next month's period is created.
--   name_format  month_year       → "November 2026"
--                short_month_year → "Nov 2026"
--                year_month       → "2026-11"
--
-- What gets created:
--   * start_date / end_date = first / last day of next month.
--   * The latest period's schedule, with the same classes (no level
--     change), days and times. Enrollments are NOT carried over — each
--     student picks their classes every month.
--   * The latest period's prices, or the default prices if it has none.
--   * No previous period, or one without a schedule: the period is still
--     created (empty schedule), so payments can be tracked; staff review it.
--
-- Rules:
--   * Studio and Pro Studio only (a past-due trial counts as Starter, same
--     as api/tenant/tenant.js).
--   * Idempotent: period_auto_run has one row per (studio, month), written
--     in the same transaction as the period. A studio that deletes an
--     auto-created period doesn't get it back.
--   * A month that already has a period starting in it (created by hand)
--     is skipped and logged, so there are never two periods for a month.
--   * No "period live" push notification for now (deferred).
--   * Each studio runs in its own subtransaction, so one failure doesn't
--     block the others.

begin;

create table public.period_auto_run (
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    month date not null check (month = date_trunc('month', month)::date),
    period_id uuid references public.period(id) on delete set null,
    status text not null check (status in ('created', 'skipped_existing')),
    created_at timestamp with time zone not null default now(),
    reviewed_at timestamp with time zone,
    primary key (tenant_id, month)
);

comment on table public.period_auto_run is 'One row per studio and month that auto_create_periods() handled. Written only by that function; staff dismiss the dashboard notice by setting reviewed_at.';
comment on column public.period_auto_run.month is 'First day of the month the period covers.';
comment on column public.period_auto_run.reviewed_at is 'Set when staff dismiss the "period created automatically" notice.';

alter table public.period_auto_run enable row level security;

create policy "tenant members select" on public.period_auto_run for select using (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.period_auto_run for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- Members can only mark the notice reviewed; rows are written by the job.
revoke all on public.period_auto_run from anon, authenticated;
grant select on public.period_auto_run to authenticated;
grant update (reviewed_at) on public.period_auto_run to authenticated;

-- auto_period_name: the period name for a month in a studio's format ----

create or replace function public.auto_period_name(p_month date, p_format text)
returns text
language sql
immutable
as $$
    select case p_format
        when 'short_month_year' then to_char(p_month, 'FMMon YYYY')
        when 'year_month' then to_char(p_month, 'YYYY-MM')
        else to_char(p_month, 'FMMonth YYYY')
    end
$$;

-- auto_create_periods: the hourly job ----------------------------------

create or replace function public.auto_create_periods()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

comment on function public.auto_create_periods() is 'Hourly (pg_cron): creates next month''s period for studios with period_auto_create enabled. Idempotent via period_auto_run.';

revoke all on function public.auto_create_periods() from public, anon, authenticated;
revoke all on function public.auto_period_name(date, text) from public, anon;
grant execute on function public.auto_period_name(date, text) to authenticated;

commit;

-- Hourly, a few minutes past so it doesn't pile onto expire-due-trials
-- (011), which may move a studio off a paid plan in the same hour.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('auto-create-periods', '10 * * * *', $$select public.auto_create_periods()$$);
