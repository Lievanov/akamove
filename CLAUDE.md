# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linting
- `npm test` - Reset + seed the local Supabase, then run the Playwright E2E suite (needs Docker and `supabase start`)
- `npm run test:seed` - Reset the local DB and seed fake studios/users (`e2e/fixtures.mjs`, password `Test1234!`)
- `npm run test:e2e` / `npm run test:e2e:ui` - Run Playwright only (headless / interactive)

### Testing

Tests never touch the cloud Supabase (the shared dev project): they run against a local Supabase (`supabase/`, schema dumped from the cloud project in `supabase/migrations/`) via `.env.test`, and Playwright starts its own dev server on port 3100 (build dir `.next-e2e`). Fake emails land in Mailpit at http://127.0.0.1:54324. Logins are saved per role in `e2e/auth.setup.mjs`; use `test.use({ storageState: authFile("proAdmin") })` in specs.

## Backlog

Planned work lives in `backlog/` (one markdown file per epic, indexed in `backlog/README.md`). Check it before starting feature work, tick off stories as they're completed in the same change, and keep the README's status sections in sync.

## Architecture Overview

This is a Next.js 14 application — the studio-management dashboard for aka Move, a platform for dance studios (classes, private lessons, students, payments, events). Built with:
- **Database**: Supabase (PostgreSQL) with authentication
- **UI**: Tailwind CSS with a headless Radix UI component kit — see `app/components/ui/` and the `tailwind-ui-kit` skill (MUI has been fully removed from the codebase)
- **State Management**: React Hook Form for forms
- **Authentication**: Google OAuth via Supabase Auth

### Core Data Model

The application manages these main entities (see `api/db.sql`):
- `student` - Student information with classes array
- `class` - Individual classes with levels and ordering
- `class_type` - Class categorization
- `period` - Time periods containing classes, locations, and schedules
- `payment` - Student payments linked to classes and periods
- `instructor` - Instructors assigned to classes
- `location` - Physical studio locations, each with its own per-period schedule
- `event` / `event_payment` - Special events with day-of vs. advance pricing
- `private_lesson` - One-off private lessons, separate from recurring classes
- `punch_pass_type` / `punch_pass` / `punch_pass_entry` - Punch passes: a studio's pass catalog, passes sold to students (own price, not a `payment` row), and one entry per class attended. Punches go through the `record_punch` RPC, which uses the oldest usable pass first
- `credit` - Student account credits (applied via the Payment form's credit fields)
- `notes` - Free-form notes attached to students
- `profiles` - Auth-linked user profiles (Google OAuth, push tokens); keyed on `id` matching `auth.users.id`, linked to `student` by email
- `settings` - Generic key/value store (default class prices, private-lesson studio fee, studio timezone)
- `deletion_requests` - Log of account-deletion requests (Play Store compliance)

### Project Structure

- `api/` - Backend data-access modules organized by entity (`class`, `credit`, `events`, `punch_pass`, `instructor`, `location`, `notes`, `payment`, `period`, `private_lesson`, `profiles`, `settings`, `student`, `charts`)
- `app/` - Next.js App Router pages and components
  - `dashboard/` - Main application interface with nested routes (see Dashboard Sections below)
  - `api/` - Next.js Route Handlers for account deletion and Stripe billing
  - `components/` - Reusable components organized by function (`ui/` — shared Tailwind kit, `form/`, `charts/`, `lists/`, `notes/`, `oauth/`, `utils/`)
  - `delete-account/` - Public account-deletion request page (Play Store compliance)
- `lib/supabase/` - Supabase client configuration

### Dashboard Sections (`app/dashboard/`)

- **Students** (`students/`) - Roster, student detail/edit pages, new-student flow. The detail page holds the punch pass card (sell a pass, record/correct/undo entries)
- **Classes** (`classes/`) - Class list and bulk update flow
- **Periods** (`periods/`) - Create/edit periods, per-location schedules, class assignment
- **Instructors** (`instructors/`) - Instructor roster and detail pages
- **Locations** (`locations/`) - Studio location roster and detail pages
- **Events** (`events/`) - Event roster, detail, and creation, with day-of vs. advance pricing
- **Private Lessons** (`private-lessons/`) - Lesson roster, detail pages, and a dedicated **reports** view (period revenue: classes + private lessons + events by date range)
- **Payments** (`payments/`) - Payment roster, per-student payment history, and edit flow
- **Notes** (`notes/`) - Student notes
- **Settings** (`settings/`) - Default class prices, private-lesson studio fee, studio timezone; punch pass types (`settings/punch-passes/`)

### Key Components

- **Forms**: Located in `app/components/form/` - CRUD forms for classes, class types, events, instructors, locations, payments, periods, private lessons, students (`ClassItemForm`, `ClassTypeForm`, `EventForm`, `EventPaymentFields`, `InstructorForm`, `LocationForm`, `PaymentForm`, `PeriodForm`, `PrivateLessonForm`, `StudentForm`, plus `SortableItem`/`UseClassDialog`/`ClassByType` helpers)
- **Charts**: In `app/components/charts/` - Analytics and data visualization (active/inactive students, student count by period, class-by-period breakdowns, events by period, private lessons by period, period revenue summary, total students)
- **Navigation**: Dashboard uses sidebar navigation via `DashboardNavbar`, gated by `app/dashboard/layout.jsx`'s role-based access check
- **Authentication**: Google OAuth handled by `GoogleOAuth.jsx`
- **Push Notifications**: none are sent today. The old `app/api/notifications/*` routes were removed (backlog 006, C1: unauthenticated, notified every studio's users); rebuild them with auth and per-studio tokens when the mobile app (backlog 003) ships. `profiles.push_token` is kept for that app.
- **Account Deletion**: `app/api/account/delete` and `app/api/account/delete-request` back the public `app/delete-account` deletion flow required for Play Store compliance (the in-app deletion path it also mentions assumes the not-yet-existing mobile app). A studio's only admin is refused (409). Requests are processed by hand per `docs/runbooks/deletion-requests.md`
- **Server-only code**: `lib/supabase/admin.js` (service role, bypasses RLS) imports `server-only`; never import it from client code. Search filters passed to `.or()` go through `ilikeAny` (`lib/supabase/filters.js`) so user input can't add filters
- **UI Components**: `app/components/ui/` holds the Tailwind + Radix UI component kit (`Button`, `TextInput`, `Select`, `Combobox`, `DatePicker`, `Dialog`, `Tabs`, `Checkbox`, `Switch`, `Chip`, `ClassChips`, `PriceListEditor`, `Table`, `Pagination`, `Alert`, `Toast`, `PageHeader`, `BackButton`) used throughout the app. See the `tailwind-ui-kit` skill (`.claude/skills/tailwind-ui-kit/SKILL.md`) for the full inventory and brand tokens.

### Database Integration

- Supabase client configured in `lib/supabase/client.js`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Row Level Security (RLS) enabled for profiles table
- Uses UUID primary keys for all main entities

### Push Notifications (Expo Push Notification Service)

**Current status: no student-facing mobile app exists yet.** The description below documents how the push infrastructure is designed to work once such an app exists (or for any future client that registers an Expo push token) — it is not describing a currently-shipping app.

Students would receive push notifications on a future aka Move mobile app (iOS + Android). That app would register an Expo push token on login and save it to the profiles.push_token column in Supabase.

To send a push notification from any server-side route or action:

// Fetch the student's push token from Supabase, then:
await fetch("https://exp.host/--/api/v2/push/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: pushToken,            // "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    title: "Your title here",
    body: "Your message here",
    data: { /* any extra payload */ },
  }),
});

Rules:
- Any route that sends must verify the caller (bearer token + admin of the studio), load the period/event server-side by id, send only to that studio's users' tokens, and send at most once per period/event (backlog 006, C1).
- push_token may be null if the student denied permissions — always check before sending.
- To send to multiple students, pass an array of token objects to the same endpoint (up to 100 per batch).
- EPNS is free and handles APNs/FCM routing — do not call APNs or FCM directly.
- Supabase URL: https://qsliwzvnwcnelqtwctyr.supabase.co
- The profiles table is keyed on id (matches auth.users.id). Students are in the student table, linked to profiles by email.