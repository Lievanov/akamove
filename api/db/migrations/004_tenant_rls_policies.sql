-- Phase 1 / Step 4: author the tenant-scoped RLS policies for every
-- business table, SIDE BY SIDE with the existing permissive policies.
--
-- IMPORTANT: this deliberately does NOT drop or alter any existing
-- policy. Postgres OR's together every applicable permissive policy per
-- command, so as long as the old `USING (true)` (or admin-only) policies
-- are still present, access is governed by whichever policy is more
-- permissive — i.e. the app's behavior is UNCHANGED after this file
-- runs. These new policies are inert until the Phase 5 cutover, which
-- drops the old policies so only these remain and tenant scoping
-- actually takes effect. Written now, and verified now (see
-- 005_verification.sql), so Phase 5 is a drop-only change with no new
-- policy logic to design under pressure.
--
-- Two shapes, matching each table's current permissiveness:
--   A) "broad member" tables (currently `true` for any authenticated
--      user): any tenant member can select/insert/update/delete.
--   B) "admin-gated" tables (currently admin-only via profiles.role):
--      any tenant member can select, only tenant admins can write.
--
-- settings is admin-gated for select too, matching its current
-- policies exactly (no public/member read policy exists on it today).

-- A) Broad member tables ------------------------------------------------

create policy "tenant members select" on public.student for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.student for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.student for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.class for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.class for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.class for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.class for delete using (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.class_type for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.class_type for insert with check (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.period for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.period for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.period for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.payment for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.payment for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.payment for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.instructors for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.instructors for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.instructors for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.instructors for delete using (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.notes for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.notes for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.notes for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.notes for delete using (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.events for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.events for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.events for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.events for delete using (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.event_payment for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.event_payment for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.event_payment for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.event_payment for delete using (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.private_lessons for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.private_lessons for insert with check (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.private_lessons for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "tenant members delete" on public.private_lessons for delete using (public.is_tenant_member(tenant_id));

create policy "tenant members select" on public.private_lesson_logs for select using (public.is_tenant_member(tenant_id));
create policy "tenant members insert" on public.private_lesson_logs for insert with check (public.is_tenant_member(tenant_id));

-- user_credit_balances already has a real per-user policy (own balance
-- only, via student.id = auth.uid()). Add tenant membership as an
-- additional acceptable path for staff/admin to read/update a student's
-- balance from the dashboard (the current policy only covers the
-- student's own mobile-app access, not staff usage from this app).
create policy "tenant members select" on public.user_credit_balances for select using (public.is_tenant_member(tenant_id));
create policy "tenant members update" on public.user_credit_balances for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- B) Admin-gated tables --------------------------------------------------

create policy "tenant members select" on public.location for select using (public.is_tenant_member(tenant_id));
create policy "tenant admins insert" on public.location for insert with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins update" on public.location for update using (public.has_tenant_role(tenant_id, array['admin'])) with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins delete" on public.location for delete using (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant members select" on public.period_location_class for select using (public.is_tenant_member(tenant_id));
create policy "tenant admins insert" on public.period_location_class for insert with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins update" on public.period_location_class for update using (public.has_tenant_role(tenant_id, array['admin'])) with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins delete" on public.period_location_class for delete using (public.has_tenant_role(tenant_id, array['admin']));

-- settings is admin-only for select too, matching its current policies
-- exactly (no member-read policy exists on it today).
create policy "tenant admins select" on public.settings for select using (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins insert" on public.settings for insert with check (public.has_tenant_role(tenant_id, array['admin']));
create policy "tenant admins update" on public.settings for update using (public.has_tenant_role(tenant_id, array['admin'])) with check (public.has_tenant_role(tenant_id, array['admin']));
