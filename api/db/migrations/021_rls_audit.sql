-- RLS audit: every public table, view and policy checked against the
-- live schema and against what the app actually reads and writes.
--
-- Fixes, most severe first:
--
-- 1. payment — the original tenant-blind policies ("Enable read access
--    for all users", "Enable insert for all users", "Enable update for
--    users", all `true`) were never dropped (008 skipped payment). RLS
--    ORs permissive policies together, so anyone holding the public anon
--    key, signed in or not, could read, insert and update every studio's
--    payments. Dropped; tenant_id backfilled from the student and made
--    NOT NULL, like the tables 008 covered. (008 held payment back for
--    handle_create_credit / handle_update_credit — neither exists in the
--    live DB, so there's nothing left to wait for.)
--
-- 2. profiles — "Public profiles are viewable by everyone" (`true`)
--    exposed every user's email and push token to the anon key. Now:
--    your own profile, plus people who share a studio with you (note
--    authors, team). The push-notification routes read tokens with the
--    service role instead (app/api/notifications/*).
--
-- 3. student_credit_balance — a materialized view (RLS can't apply to
--    those) granted to anon: every student's credit total across all
--    studios. Unused by the app; access revoked.
--
-- 4. user_credit_balances — two leftover policies compared student.id to
--    auth.uid() (a student id is never a user id). Dropped; tenant_id
--    backfilled and made NOT NULL.
--
-- 5. settings — select was admin-only, but staff pages read the studio
--    timezone (PaymentForm, PunchPassesByStudent) and silently fell back
--    to the default. Members can now read; writes stay admin-only.
--
-- 6. Missing policies, so a table's policy set is complete and a future
--    edit/delete doesn't silently affect zero rows. Destructive ones are
--    admin-only:
--      class_type          update, delete (admins)
--      student             delete (admins)
--      period              delete (admins)
--      payment             delete (admins)
--      private_lesson_logs update, delete (admins)
--      profiles            update gets a WITH CHECK (can't re-key a row)
--
-- 7. Defense in depth — tables written only by server routes / jobs with
--    the service role have RLS on and no policies (so nothing gets
--    through); their grants to anon/authenticated are revoked too:
--    cancellation_feedback, deletion_requests, stripe_event, trial_code.
--    And the RPCs that already require a signed-in user are no longer
--    executable by anon.
--
-- Deliberately unchanged (written through SECURITY DEFINER functions):
--   tenant (create_tenant_and_admin), tenant_billing (webhook, service
--   role), trial_usage, period_auto_run inserts (auto_create_periods),
--   punch_pass_entry inserts (record_punch), tenant_invite acceptance
--   (accept_pending_invites).

begin;

-- 1. payment -------------------------------------------------------------

drop policy if exists "Enable read access for all users" on public.payment;
drop policy if exists "Enable insert for all users" on public.payment;
drop policy if exists "Enable update for users" on public.payment;

update public.payment p
set tenant_id = s.tenant_id
from public.student s
where s.id = p.student_id
  and p.tenant_id is null;

do $$
begin
  if exists (select 1 from public.payment where tenant_id is null) then
    raise exception 'payment rows without a tenant_id remain (student missing) — fix them before running 021';
  end if;
end $$;

alter table public.payment alter column tenant_id set not null;

create policy "tenant admins delete" on public.payment
  for delete using (public.has_tenant_role(tenant_id, array['admin']));

-- 2. profiles ------------------------------------------------------------

-- SECURITY DEFINER so the lookup doesn't run through user_tenant's own
-- RLS (which only shows other members to admins).
create or replace function public.shares_tenant_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_tenant me
    join public.user_tenant them on them.tenant_id = me.tenant_id
    where me.user_id = auth.uid()
      and them.user_id = p_user_id
  );
$$;

revoke all on function public.shares_tenant_with(uuid) from public, anon;
grant execute on function public.shares_tenant_with(uuid) to authenticated;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

create policy "own profile or teammates" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_tenant_with(id));

drop policy if exists "Users can update own profile." on public.profiles;

create policy "Users can update own profile." on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 3. student_credit_balance ----------------------------------------------

revoke all on public.student_credit_balance from anon, authenticated;

-- 4. user_credit_balances ------------------------------------------------

drop policy if exists "Allow read access to own credit balance" on public.user_credit_balances;
drop policy if exists "Allow update of own credit balance" on public.user_credit_balances;

update public.user_credit_balances b
set tenant_id = s.tenant_id
from public.student s
where s.id = b.student_id
  and b.tenant_id is null;

do $$
begin
  if exists (select 1 from public.user_credit_balances where tenant_id is null) then
    raise exception 'user_credit_balances rows without a tenant_id remain (student missing) — fix them before running 021';
  end if;
end $$;

alter table public.user_credit_balances alter column tenant_id set not null;

-- 5. settings ------------------------------------------------------------

drop policy if exists "tenant admins select" on public.settings;

create policy "tenant members select" on public.settings
  for select using (public.is_tenant_member(tenant_id));

-- 6. missing policies ----------------------------------------------------

create policy "tenant admins update" on public.class_type
  for update using (public.has_tenant_role(tenant_id, array['admin']))
  with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins delete" on public.class_type
  for delete using (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins delete" on public.student
  for delete using (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins delete" on public.period
  for delete using (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins update" on public.private_lesson_logs
  for update using (public.has_tenant_role(tenant_id, array['admin']))
  with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins delete" on public.private_lesson_logs
  for delete using (public.has_tenant_role(tenant_id, array['admin']));

-- 7. defense in depth ----------------------------------------------------

revoke all on public.cancellation_feedback from anon, authenticated;
revoke all on public.deletion_requests from anon, authenticated;
revoke all on public.stripe_event from anon, authenticated;
revoke all on public.trial_code from anon, authenticated;

revoke execute on function public.accept_pending_invites() from public, anon;
revoke execute on function public.create_tenant_and_admin(text, text, boolean, text) from public, anon;
revoke execute on function public.downgrade_tenant_plan(uuid, text) from public, anon;
revoke execute on function public.redeem_trial_code(uuid, text) from public, anon;
grant execute on function public.accept_pending_invites() to authenticated;
grant execute on function public.create_tenant_and_admin(text, text, boolean, text) to authenticated;
grant execute on function public.downgrade_tenant_plan(uuid, text) to authenticated;
grant execute on function public.redeem_trial_code(uuid, text) to authenticated;

commit;
