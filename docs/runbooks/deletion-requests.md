# Processing account deletion requests

Requests come from the public `/delete-account` page and land in `deletion_requests`
(service role only). Anyone can type any email there, so **never delete before the owner of
the address confirms**. The page promises processing within **30 days**.

Check for new requests at least once a week (Supabase dashboard → SQL editor, cloud project):

```sql
select id, email, reason, status, created_at
from public.deletion_requests
where status in ('pending', 'awaiting_confirmation')
order by created_at;
```

## 1. Verify ownership
Email the address from the support inbox. Never reply to a different address, and don't
say whether an account exists:

> We received a request to delete the aka Move account for this email address. If you made
> this request, reply "confirm" within 14 days. If you didn't, ignore this email and nothing
> will change.

```sql
update public.deletion_requests set status = 'awaiting_confirmation' where id = '<id>';
```

No reply after 14 days → `status = 'expired'`. Done.

## 2. Find the account
```sql
select u.id, u.email, ut.tenant_id, t.name, ut.role
from auth.users u
left join public.user_tenant ut on ut.user_id = u.id
left join public.tenant t on t.id = ut.tenant_id
where lower(u.email) = lower('<email>');
```

- **No account:** the address may still be a *student* in some studio's records. Studios own
  student data: reply that we've forwarded the request to their studio(s), forward it, and
  set `status = 'forwarded'`.
- **Only admin of a studio** (`role = 'admin'` and no other admin in that studio): don't
  delete. Ask them to make someone else an admin, or to cancel the subscription first if
  they're closing the studio. Studio data is then kept per the retention policy (006, Phase 4).
  The `/api/account/delete` route refuses this case too (409 `sole_admin`).

## 3. Delete
Supabase dashboard → Authentication → Users → the user → **Delete user**. That removes the
login, the profile (cascade) and their studio memberships. Payments, students and invites they
created stay with the studio; their name is cleared from punch entries and invites.

## 4. Log the outcome
```sql
update public.deletion_requests set status = 'completed' where id = '<id>';
```

Reply to the requester that it's done. Statuses in use: `pending`, `awaiting_confirmation`,
`completed`, `forwarded`, `expired`, `refused` (with the reason in your reply).
