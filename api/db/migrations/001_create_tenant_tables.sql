-- Phase 1 / Step 1: Core multi-tenant tables + RLS helper functions.
-- Additive only. Safe to run against production as-is: creates new
-- objects, touches no existing table, changes no existing behavior.

create table public.tenant (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique,
    plan text not null default 'starter' check (plan in ('starter', 'studio', 'pro studio')),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

comment on table public.tenant is 'A studio/organization. plan is data-only for now — no gating enforced.';

create table public.user_tenant (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    role text not null default 'staff' check (role in ('staff', 'admin')),
    created_at timestamp with time zone not null default now(),
    unique (user_id, tenant_id)
);

comment on table public.user_tenant is 'Per-tenant membership + role. Source of truth for admin/staff, replacing profiles.role.';

create index user_tenant_user_id_idx on public.user_tenant(user_id);
create index user_tenant_tenant_id_idx on public.user_tenant(tenant_id);

create table public.tenant_invite (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenant(id) on delete cascade,
    email text not null,
    role text not null default 'staff' check (role in ('staff', 'admin')),
    invited_by uuid references auth.users(id),
    status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
    created_at timestamp with time zone not null default now(),
    expires_at timestamp with time zone,
    accepted_at timestamp with time zone
);

comment on table public.tenant_invite is 'Pending email invites. Auto-accepted on first matching login (see accept_pending_invite RPC, Phase 4).';

create index tenant_invite_tenant_id_idx on public.tenant_invite(tenant_id);
create unique index tenant_invite_pending_email_idx on public.tenant_invite (tenant_id, lower(email)) where (status = 'pending');

-- RLS on the new tables themselves. Members can see their own membership
-- rows and (transitively) other members of tenants they belong to; only
-- tenant admins can manage membership/invites directly. Invite acceptance
-- and self-serve tenant creation bypass this via SECURITY DEFINER RPCs
-- added in later phases, not by loosening these policies.

alter table public.tenant enable row level security;
alter table public.user_tenant enable row level security;
alter table public.tenant_invite enable row level security;

-- Helper functions -----------------------------------------------------
-- security definer + fixed search_path so they can read user_tenant
-- regardless of the caller's own RLS on it, and can't be hijacked via
-- search_path manipulation.

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_tenant ut
    where ut.tenant_id = p_tenant_id
      and ut.user_id = auth.uid()
  );
$$;

comment on function public.is_tenant_member(uuid) is 'True if the calling user (auth.uid()) is a member of the given tenant.';

create or replace function public.has_tenant_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_tenant ut
    where ut.tenant_id = p_tenant_id
      and ut.user_id = auth.uid()
      and ut.role = any (p_roles)
  );
$$;

comment on function public.has_tenant_role(uuid, text[]) is 'True if the calling user has one of the given roles in the given tenant.';

-- tenant: any member can read their tenant's row; only an admin can
-- update it (e.g. rename, change plan later); creation happens via the
-- create_tenant_and_admin RPC (Phase 3), not a direct insert.
create policy "tenant members can select tenant" on public.tenant
    for select using (public.is_tenant_member(id));

create policy "tenant admins can update tenant" on public.tenant
    for update using (public.has_tenant_role(id, array['admin']))
    with check (public.has_tenant_role(id, array['admin']));

-- user_tenant: a user can see their own membership rows, or any row in a
-- tenant they admin (to list teammates). Only admins can add/remove
-- members directly; invite-acceptance/self-serve creation go through
-- SECURITY DEFINER RPCs added in Phase 3/4.
create policy "select own or as tenant admin" on public.user_tenant
    for select using (
        user_id = auth.uid()
        or public.has_tenant_role(tenant_id, array['admin'])
    );

create policy "tenant admins manage members" on public.user_tenant
    for all using (public.has_tenant_role(tenant_id, array['admin']))
    with check (public.has_tenant_role(tenant_id, array['admin']));

-- tenant_invite: only tenant admins can create/list/revoke invites for
-- their tenant. Acceptance is via SECURITY DEFINER RPC (Phase 4), not a
-- policy grant to the invited (not-yet-a-member) user.
create policy "tenant admins manage invites" on public.tenant_invite
    for all using (public.has_tenant_role(tenant_id, array['admin']))
    with check (public.has_tenant_role(tenant_id, array['admin']));
