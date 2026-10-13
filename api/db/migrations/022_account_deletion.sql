-- Account deletion (backlog 006, H4).
--
-- tenant_invite.invited_by referenced auth.users with no ON DELETE rule,
-- so auth.admin.deleteUser failed (500) for anyone who had ever sent an
-- invite. The invite is the studio's record, not the inviter's: keep it
-- and forget who sent it.
--
-- The "only admin of a studio" case is refused in the route
-- (app/api/account/delete), not here. No data changes.

begin;

alter table public.tenant_invite
    drop constraint tenant_invite_invited_by_fkey,
    add constraint tenant_invite_invited_by_fkey
        foreign key (invited_by) references auth.users(id) on delete set null;

commit;
