# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Studio admin/owner** — full access: settings, locations, instructors, periods/pricing, all reports, all sections.
- **Front-desk / staff** — day-to-day operations (students, classes, payments, events, private lessons) but not admin-only sections (Periods, Instructors, Private Lessons, Locations, Settings are gated admin-only in the nav; Events requires admin or staff).

Both roles log in via Google OAuth (Supabase Auth) and work from this dashboard to run day-to-day studio operations.

## Product Purpose

aka Move is a platform for dance studios: managing classes, private lessons, students, payments, and events. This dashboard is the studio-side management tool — admins and staff use it to run the studio's day-to-day operations (enroll/track students, schedule classes per period and location, record payments and credits, manage instructors, run one-off private lessons, host events with day-of vs. advance pricing, and see revenue/attendance reports).

## Positioning

Purpose-built for dance studios specifically (not a generic scheduling/CRM tool) — the data model (class levels, per-location period schedules, instructor assignment, private lessons distinct from recurring classes, student credits) reflects how a dance studio actually runs, rather than a repurposed general-business tool.

## Operating Context

- Studio operates across **multiple physical locations**, each with its own per-period class schedule.
- Work is organized around **periods** (session terms) — classes, pricing, and schedules are set per period.
- **Payments** track per-student, per-class/period, with a credit system and multiple payment methods.
- **Events** (workshops, etc.) have separate day-of vs. advance pricing, tracked apart from regular class payments.
- **Private lessons** are purchased in blocks (lessons_purchased) and consumed over time (lessons_used), separate from the recurring class/period system.
- Role-gated navigation: admin sees everything; staff sees a reduced set (no Settings, Locations, Instructors, Periods, Private Lessons roster — though Events and student-facing sections remain visible to staff).
- Public, unauthenticated `/delete-account` page exists for Play Store account-deletion compliance requests — independent of the dashboard.

## Capabilities and Constraints

- **No student-facing mobile app currently exists.** The codebase contains push-notification infrastructure (Expo push tokens on the `profiles` table, notification route handlers for period/event launches) and account-deletion API routes anticipating a future mobile app, but nothing is live today — this is forward-looking/vestigial infrastructure, not a shipping product surface. Do not describe or design around an app that exists.
- Auth: Google OAuth via Supabase; roles are `admin`, `staff` (and a `student` role exists in the schema but has no dashboard access — student-role users are redirected away from `/dashboard`).
- Backend: Supabase (PostgreSQL), with Row Level Security enabled at least on `profiles`.
- Stack: Next.js 14 App Router, Tailwind CSS with a headless Radix UI component kit (`app/components/ui/`, documented in the `tailwind-ui-kit` skill). MUI has been fully removed from the codebase.

## Brand Commitments

- Name: **aka Move**. Logo asset at `public/images/am_logo.png` — dark aubergine circular mark, pink/magenta ring and "aka" wordmark set in Fraunces (serif), cream "Move" wordmark.
- Body font: Source Sans 3. Display/logo-adjacent font: Fraunces (not for body copy or form UI).
- Brand colors (estimated from the logo, defined as Tailwind tokens `brand.pink` `#E8195E`, `brand.dark` `#1B0E1E`, `brand.cream` `#F7E7E2`) — worth a real color-picker check against the logo if pixel-accurate brand color ever matters.

## Evidence on Hand

- Logo: `public/images/am_logo.png`.
- No customer testimonials, case studies, press, or marketing copy on hand — this is an internal operations dashboard, not a marketing surface.

## Product Principles

1. **Studio-shaped, not generic.** Model the domain the way dance studios actually work (periods, per-location schedules, private-lesson blocks, event day-of pricing) rather than forcing a generic scheduling/CRM shape.
2. **Role-appropriate access.** Staff get what they need for daily operations; admin-only surfaces (money settings, instructor roster, location management) stay gated.
3. **Operational speed over marketing polish.** This is a tool studio staff use repeatedly during the day — scanability, fast data entry, and predictable navigation matter more than expressive/marketing-grade visual design.
4. **Don't design around infrastructure that isn't live.** Push notifications and mobile-app-oriented account deletion exist in the code but have no current app consumer — treat them as backend readiness, not a real product surface, until a mobile app actually exists.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond standard web accessibility practice.
