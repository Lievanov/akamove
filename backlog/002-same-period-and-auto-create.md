---
status: in-progress
priority: high
depends_on: []
---
# Keep same classes across periods + auto-create periods

## Goal
Today, creating a new period copies the previous schedule and **moves every class up to
its next level** (`app/dashboard/periods/new/page.jsx` → `buildNextClassMap`). Some studios
run the same classes every month and use periods only to track monthly payments.

1. Give the user a choice when creating a period: **keep the same classes** or **advance levels**.
2. Optionally **create the next period automatically** (e.g. at the start of each month)
   with the same classes, so payments can be tracked without manual setup. The user picks
   when the period is created.

## Stories
- [x] Period form: "Keep same classes / Advance to next level" toggle; update the info Alert copy to match
- [x] Remember the studio's preferred default in `settings` (`new_period_classes` key, set under Settings → New Period Classes)
- [x] Settings: turn on auto-create and pick the schedule (e.g. day of month and lead time,
      such as "on the 25th, create next month's period") — day 1–28, always creates next month's period
- [x] Settings: naming pattern for auto-created periods (e.g. "October 2026") — "November 2026" / "Nov 2026" / "2026-11"
- [x] Scheduled job that creates the period per tenant: copy schedule, prices, dates; make it
      idempotent (never create duplicates) — `pg_cron` + `auto_create_periods()` in migration 020
      (no Vercel cron, so it works on any host)
- [ ] Decide whether auto-created periods send the "period live" push notification — deferred; none sent for now
- [ ] Run migration 020 in Supabase and check it by hand (enable in Settings, set the day to today, run `select public.auto_create_periods();`, confirm the period and the Periods page notice)
- [x] Dashboard notice or email to staff when a period was auto-created, with a link to review it — notice on the Periods page; email not done
- [x] Handle the edge cases: no previous period, previous period has no schedule, tenant on a plan without this feature

## Decisions (2026-10-12)
- Studio and Pro Studio only — it's a paid feature (enforced in the job and shown locked on Starter).
- Monthly only: periods are sold monthly so payment reporting lines up.
- Only the schedule and prices carry over, never enrollments — each student picks their classes every month.
- Auto-created periods always keep the same classes (no level change), whatever the New period default is.
- Runs inside Supabase (`pg_cron`), like the trial-expiry job — no separate server needed.
- Push notifications: to be discussed later.
