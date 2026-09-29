-- Phase 4: invite acceptance RPC.
--
-- A user with a pending invite can't insert into `user_tenant` directly
-- (insert is admin-gated — see 001), and isn't an admin of the inviting
-- tenant. This SECURITY DEFINER function re-validates the invite
-- belongs to the calling user's own email before attaching them, rather
-- than loosening `user_tenant`'s insert policy for everyone.
--
-- Accepts every pending invite matching the caller's profile email (not
-- just one), since a user could plausibly be invited to more than one
-- studio before their first login. Returns the tenant(s) they were just
-- attached to, if any.

create or replace function public.accept_pending_invites()
returns setof public.tenant
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    caller_email text;
    invite public.tenant_invite;
begin
    if auth.uid() is null then
        raise exception 'must be authenticated to accept invites';
    end if;

    select email into caller_email from public.profiles where id = auth.uid();
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

comment on function public.accept_pending_invites() is 'Attaches the calling user to every tenant that has a pending invite for their profile email. Called on login (Phase 4).';

grant execute on function public.accept_pending_invites() to authenticated;
