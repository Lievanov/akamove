-- Verification for 015. Read-only. Run after 015 and check each block
-- against its `expect` comment.

-- 1. The three billing tables exist with RLS on.
-- expect: 3 rows, rowsecurity = true for all.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('tenant_billing', 'stripe_event', 'cancellation_feedback')
order by tablename;

-- 2. Only tenant_billing has a client policy (admin select); the other
--    two are service-role only.
-- expect: exactly 1 row — tenant_billing / "tenant admins can select billing" / SELECT.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('tenant_billing', 'stripe_event', 'cancellation_feedback');

-- 3. authenticated can't write billing_exempt (or plan, or trial columns).
-- expect: 3 rows — name, slug, updated_at.
select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'tenant'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;

-- 4. apply_stripe_subscription is callable by the service role only.
-- expect: service_role = true; anon = false; authenticated = false.
select
    has_function_privilege('service_role', p.oid, 'execute') as service_role,
    has_function_privilege('anon', p.oid, 'execute') as anon,
    has_function_privilege('authenticated', p.oid, 'execute') as authenticated
from pg_proc p
where p.proname = 'apply_stripe_subscription'
  and p.pronamespace = 'public'::regnamespace;

-- 5. The original studio is exempt.
-- expect: 1 row, billing_exempt = true, plan unchanged (studio).
select name, plan, billing_exempt
from public.tenant
where slug = 'default-studio';

-- 6. No non-exempt studio is on a paid plan without a live subscription,
--    other than ones still on an active trial.
-- expect: 0 rows.
select t.id, t.name, t.plan, t.trial_status
from public.tenant t
where t.plan in ('studio', 'pro studio')
  and not t.billing_exempt
  and t.trial_status is distinct from 'active'
  and not exists (
      select 1 from public.tenant_billing b
      where b.tenant_id = t.id
        and b.status in ('trialing', 'active', 'past_due')
  );

-- 7. Every remaining paid-plan studio, for a quick eyeball.
-- expect: only billing-exempt studios and active trials.
select name, plan, billing_exempt, trial_status, trial_ends_at
from public.tenant
where plan in ('studio', 'pro studio')
order by billing_exempt desc, name;
