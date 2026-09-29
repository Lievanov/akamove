-- Phase 1 / Step 2: add a nullable tenant_id to every tenant-scoped
-- business table. Nullable on purpose — existing rows get backfilled in
-- 003, and NOT NULL is only enforced in Phase 5, after the app is
-- updated to always send tenant_id. Safe to run against production:
-- purely additive, no existing query or RLS policy is affected (all
-- current policies ignore this new column).
--
-- deletion_requests is intentionally excluded: it has RLS enabled but no
-- policies at all (service-role access only, used solely by
-- app/api/account/delete{,-request}/route.js for Play Store compliance),
-- and it's a record of a user deleting their account, not studio data —
-- there's nothing to scope it to.

alter table public.student add column tenant_id uuid references public.tenant(id);
create index student_tenant_id_idx on public.student(tenant_id);

alter table public.class add column tenant_id uuid references public.tenant(id);
create index class_tenant_id_idx on public.class(tenant_id);

alter table public.class_type add column tenant_id uuid references public.tenant(id);
create index class_type_tenant_id_idx on public.class_type(tenant_id);

alter table public.period add column tenant_id uuid references public.tenant(id);
create index period_tenant_id_idx on public.period(tenant_id);

alter table public.payment add column tenant_id uuid references public.tenant(id);
create index payment_tenant_id_idx on public.payment(tenant_id);

alter table public.instructors add column tenant_id uuid references public.tenant(id);
create index instructors_tenant_id_idx on public.instructors(tenant_id);

alter table public.location add column tenant_id uuid references public.tenant(id);
create index location_tenant_id_idx on public.location(tenant_id);

alter table public.events add column tenant_id uuid references public.tenant(id);
create index events_tenant_id_idx on public.events(tenant_id);

alter table public.event_payment add column tenant_id uuid references public.tenant(id);
create index event_payment_tenant_id_idx on public.event_payment(tenant_id);

alter table public.notes add column tenant_id uuid references public.tenant(id);
create index notes_tenant_id_idx on public.notes(tenant_id);

alter table public.private_lessons add column tenant_id uuid references public.tenant(id);
create index private_lessons_tenant_id_idx on public.private_lessons(tenant_id);

alter table public.private_lesson_logs add column tenant_id uuid references public.tenant(id);
create index private_lesson_logs_tenant_id_idx on public.private_lesson_logs(tenant_id);

alter table public.period_location_class add column tenant_id uuid references public.tenant(id);
create index period_location_class_tenant_id_idx on public.period_location_class(tenant_id);

alter table public.user_credit_balances add column tenant_id uuid references public.tenant(id);
create index user_credit_balances_tenant_id_idx on public.user_credit_balances(tenant_id);

-- settings keeps its single-column `key` PK for now (composite-PK
-- restructuring is Phase 6, done together with the api/settings/settings.js
-- call-site update). tenant_id is added nullable here so Phase 1's
-- backfill can tag existing rows; until Phase 6 the app continues to
-- treat `key` as globally unique, which still holds true today since
-- only the one default tenant exists.
alter table public.settings add column tenant_id uuid references public.tenant(id);
create index settings_tenant_id_idx on public.settings(tenant_id);
