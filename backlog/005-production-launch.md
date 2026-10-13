---
status: idea
priority: high
depends_on: [001-punch-pass, 002-same-period-and-auto-create, 006-security-privacy-compliance]
---
# Production launch (Firebase App Hosting + Supabase Pro)

## Goal
Move the app from the dev setup (Vercel Hobby + Supabase Free) to production before the
first paying studio. Host the Next.js app on **Firebase App Hosting** and keep Supabase as
the database and auth. Vercel Hobby does not allow commercial use, and Supabase Free pauses
projects after a week of inactivity and has no backups.

The only Vercel-specific piece is `vercel.json` (the daily `/api/billing/reconcile` cron).
The route already checks `Authorization: Bearer $CRON_SECRET`, so Cloud Scheduler can call it unchanged.

## Stories — hosting
- [ ] Firebase project on the Blaze plan, with a budget alert
- [ ] `apphosting.yaml`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `NEXT_PUBLIC_APP_URL` available at BUILD + RUNTIME; `SUPABASE_SERVICE_ROLE_KEY`,
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET` in Secret Manager;
      `STRIPE_PORTAL_CONFIGURATION_ID` as a plain value
- [ ] App Hosting backend connected to the GitHub repo (`main` → production), in a region close to the Supabase project
- [ ] Cloud Scheduler job: daily `GET /api/billing/reconcile` with the `CRON_SECRET` bearer header
- [ ] Custom domain + SSL on App Hosting; switch DNS once the Firebase URL is verified
- [ ] Remove `vercel.json` and update the Vercel references in CLAUDE.md and backlog 002

## Stories — Supabase
- [ ] Upgrade to Supabase Pro (daily backups, no pausing)
- [ ] Auth: set Site URL and redirect URLs to the production domain (Google OAuth, password reset)
- [ ] Google Cloud OAuth client: add production redirect URIs if needed
- [ ] Confirm all migrations (`api/db/migrations/`) are applied and the verification scripts pass

## Stories — Stripe
- [ ] Switch to live-mode keys and run `npm run stripe:setup` against live mode
- [ ] Live webhook endpoint at the production domain; store its signing secret as `STRIPE_WEBHOOK_SECRET`
- [ ] Stripe Tax registrations and live customer portal configuration

## Stories — launch checks
- [ ] Smoke test in production: sign-up → trial → checkout → webhook → plan change → cancel
- [ ] Error monitoring/logging (Cloud Logging alerts on 5xx at minimum)
- [ ] Privacy policy and terms pages live (also needed by 003) — see 006 Phase 4

## Open questions
- Keep a staging environment (second App Hosting backend + second Supabase project) or go straight to prod?
- Which region for Supabase and App Hosting, given where the first studios are?
- Launch before the native app (003) and check-in (004), or wait for them?
