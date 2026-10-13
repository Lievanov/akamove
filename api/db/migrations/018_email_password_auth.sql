-- Email + password sign-in (alongside Google).
--
-- 1. handle_new_user read the profile email from raw_user_meta_data,
--    which only Google fills in. An email/password sign-up has its
--    address in auth.users.email and only what the app passes in
--    signUp's options.data (full_name) in the metadata — so its profile
--    got a null email, and invites (matched by email) never attached.
--    Now: auth.users.email first, metadata as the fallback.
--
-- 2. Backfill any profile left with a null email.
--
-- 3. accept_pending_invites matched invites against profiles.email,
--    which the "Users can update own profile." policy lets anyone edit
--    — and an email/password account can exist before its address is
--    confirmed. It now matches the auth.users address, and only once
--    that address is confirmed (Google sign-ins are confirmed on
--    creation).

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null
  and u.email is not null;

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

comment on function public.accept_pending_invites() is 'Attaches the calling user to every tenant that has a pending invite for their confirmed auth email. Called on login.';

grant execute on function public.accept_pending_invites() to authenticated;

commit;
