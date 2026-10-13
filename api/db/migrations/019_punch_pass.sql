-- Phase 12: punch passes (backlog 001).
--
-- A student buys a pass for a fixed number of entries (e.g. 10 classes).
-- Each class they come to is recorded as an entry ("punch") against it.
--
--   punch_pass_type   the studio's catalog (Settings → Punch passes): name,
--                     entries, price, optional validity in days. Admin-only
--                     writes.
--   punch_pass        one pass sold to one student. Name/entries/price are
--                     copied from the type at sale time, so later catalog
--                     edits don't rewrite history. Holds its own price and
--                     payment method — like private_lessons, a sale is not a
--                     `payment` row (payment needs a period and classes).
--   punch_pass_entry  one punch. Remaining = total_entries - count(entries);
--                     there is no stored counter to drift.
--
-- Rules (decided with the studio):
--   * A pass is valid for any class; class/location on a punch are optional.
--   * Expiry is optional (null = never) and editable after the sale.
--   * A student can buy a new pass before the current one runs out; passes
--     are used in the order they were bought (oldest usable pass first).
--     An expired pass is skipped, so its leftover entries don't block the
--     next one.
--   * Passes are not shared between students.
--   * Punching with no usable pass is refused (`no_active_pass`).
--
-- Punches are only created through record_punch(), which picks the pass and
-- locks the student's passes so two simultaneous punches can't both take the
-- last entry. Staff can still correct a punch's date/class/location/notes and
-- delete one made by mistake.

begin;

create table public.punch_pass_type (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    name text not null check (btrim(name) <> ''),
    total_entries integer not null check (total_entries > 0),
    price numeric(10,2) not null check (price >= 0),
    validity_days integer check (validity_days > 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index punch_pass_type_tenant_id_idx on public.punch_pass_type(tenant_id);

create table public.punch_pass (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    student_id uuid not null references public.student(id),
    pass_type_id uuid references public.punch_pass_type(id) on delete set null,
    name text not null check (btrim(name) <> ''),
    total_entries integer not null check (total_entries > 0),
    price numeric(10,2) not null check (price >= 0),
    payment_method text,
    purchased_on date not null default current_date,
    expires_on date,
    notes text,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references public.profiles(id) on delete set null,
    constraint punch_pass_expiry_after_purchase check (expires_on is null or expires_on >= purchased_on)
);

create index punch_pass_tenant_id_idx on public.punch_pass(tenant_id);
create index punch_pass_student_id_idx on public.punch_pass(student_id);
create index punch_pass_tenant_purchased_on_idx on public.punch_pass(tenant_id, purchased_on);

create table public.punch_pass_entry (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    punch_pass_id uuid not null references public.punch_pass(id) on delete cascade,
    used_at timestamptz not null default now(),
    class_id uuid references public.class(id) on delete set null,
    location_id uuid references public.location(id) on delete set null,
    notes text,
    recorded_by uuid default auth.uid() references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index punch_pass_entry_tenant_id_idx on public.punch_pass_entry(tenant_id);
create index punch_pass_entry_punch_pass_id_idx on public.punch_pass_entry(punch_pass_id);

-- RLS -------------------------------------------------------------------

alter table public.punch_pass_type enable row level security;
alter table public.punch_pass enable row level security;
alter table public.punch_pass_entry enable row level security;

-- Pass types: everyone in the studio reads them (staff pick one when
-- selling); only admins manage the catalog.
create policy "tenant members select" on public.punch_pass_type for select using (public.is_tenant_member(tenant_id));
create policy "tenant admins insert" on public.punch_pass_type for insert with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins update" on public.punch_pass_type for update using (public.has_tenant_role(tenant_id, array['admin'])) with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins delete" on public.punch_pass_type for delete using (public.has_tenant_role(tenant_id, array['admin']));

-- Passes: staff sell and edit them (front desk); only admins delete one,
-- since that also removes its revenue and punch history.
create policy "tenant members select" on public.punch_pass for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.punch_pass for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.punch_pass for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant admins delete" on public.punch_pass for delete using (public.has_tenant_role(tenant_id, array['admin']));

-- Entries: no insert policy — punches go through record_punch().
create policy "tenant members select" on public.punch_pass_entry for select using (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.punch_pass_entry for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.punch_pass_entry for delete using (public.is_tenant_member(tenant_id));

-- A correction can change when/where a punch happened, not which pass it
-- counts against (that would let a pass go over its entries).
revoke update on public.punch_pass_entry from authenticated;
grant update (used_at, class_id, location_id, notes) on public.punch_pass_entry to authenticated;

-- A sold pass stays with its student; edits are corrections and extensions.
revoke update on public.punch_pass from authenticated;
grant update (name, total_entries, price, payment_method, purchased_on, expires_on, notes) on public.punch_pass to authenticated;

-- Lowering a pass's entries below what's already been used would leave it
-- with a negative balance.
create or replace function public.punch_pass_check_total_entries()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if new.total_entries < (select count(*) from public.punch_pass_entry where punch_pass_id = new.id) then
        raise exception 'entries_below_used';
    end if;
    return new;
end;
$$;

create trigger punch_pass_check_total_entries
    before update of total_entries on public.punch_pass
    for each row execute function public.punch_pass_check_total_entries();

-- record_punch ----------------------------------------------------------

-- Records one entry for a student on their best usable pass and returns
-- it. "Usable" means entries left and not expired on the punch's date in
-- the studio's timezone (settings.timezone, same default as the app).
-- Raises:
--   student_not_found  no such student in a studio the caller belongs to
--   invalid_class / invalid_location  not in the student's studio
--   no_active_pass     every pass is used up or expired (or there are none)
create or replace function public.record_punch(
    p_student_id uuid,
    p_used_at timestamptz default now(),
    p_class_id uuid default null,
    p_location_id uuid default null,
    p_notes text default null
)
returns public.punch_pass_entry
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

revoke execute on function public.record_punch(uuid, timestamptz, uuid, uuid, text) from public, anon;
grant execute on function public.record_punch(uuid, timestamptz, uuid, uuid, text) to authenticated;

commit;
