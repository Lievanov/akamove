# Changelog

All notable changes to the aka Move app are documented in this file.

## 2026-09-29

### Added

- **Multi-tenant SaaS foundation**: the dashboard now supports multiple studios ("tenants") sharing one deployment, each with its own isolated data, instead of one studio per deployment.
  - **Schema**: new `tenant` (`name`, `plan` — `starter`/`studio`/`pro studio`, data-only for now, no plan-based gating yet), `user_tenant` (per-tenant membership + role, `staff`/`admin` — replaces the old global `profiles.role` as the source of truth for admin/staff), and `tenant_invite` (pending email invites) tables. A `tenant_id` column was added to every business table (`student`, `class`, `class_type`, `period`, `payment`, `instructors`, `location`, `events`, `event_payment`, `notes`, `private_lessons`, `private_lesson_logs`, `period_location_class`, `settings`), backfilled into one "Default Studio" tenant so existing data and users kept working throughout the migration. SQL lives in `api/db/migrations/001`–`010`, with a paired verification file after each risky step.
  - **Row Level Security cutover**: every tenant-scoped table's old tenant-blind policies (`USING (true)` / global-admin) were replaced with tenant-membership-aware policies via two helper functions, `is_tenant_member(tenant_id)` and `has_tenant_role(tenant_id, roles)`. `payment` and `user_credit_balances` are intentionally still on the old policies pending review of two undocumented database functions (`handle_create_credit`, `handle_update_credit`) that write to them outside the app layer.
  - **Tenant context & switcher**: new `app/context/TenantContext.jsx` (`TenantProvider`/`useActiveTenant()`) resolves the signed-in user's tenant memberships, persists the active one, and exposes it app-wide. `DashboardNavbar` gained a studio switcher dropdown (shown only when a user belongs to more than one studio). Role-gated routes and admin-only in-page checks across the dashboard now read the user's role for the *active* tenant instead of a single global role.
  - **Self-serve onboarding**: new `/onboarding/create-tenant` page — a brand-new user with no studio yet lands here (from `/dashboard`'s access check) and can create one, becoming its admin via a `create_tenant_and_admin` database function. The plan step shows the actual Starter/Studio/Pro Studio pricing cards (name, price, student cap, features), sourced from the same `pricingTiers` data the public pricing page uses, so the two never drift out of sync. Includes an "I'm a staff member" dialog for users who should be invited rather than create a new studio, and a sign-out "back to home" header action.
  - **Invites**: admins can invite a teammate by email + role from **Settings → Manage Team** (`/dashboard/settings/team`), which creates a pending `tenant_invite` row (no email is sent — the admin tells the person directly). When that email next logs in, `accept_pending_invites` auto-attaches them to the studio with the invited role.
  - **App-wide tenant scoping**: every read/write across the 16 `api/*.js` data-access modules (`class`, `class_type`, `credit`, `events`, `event_payment`, `instructor`, `location`, `notes`, `payment`, `period`, `period_location_class`, `private_lesson`, `settings`, `student`, `charts`) now scopes to the active tenant via a new `lib/tenant/activeTenant.js` accessor; the app's own database views were already `security_invoker`, so they inherit the same isolation automatically once RLS is cut over.

### Fixed

- **Post-login redirect**: signing in with Google previously redirected back to the public marketing homepage with no further routing, leaving signed-in users stranded there. `/` now checks for a session on load and sends non-student users into `/dashboard` (which in turn routes brand-new users into onboarding), with a guard to avoid looping the `student` role (which `/dashboard` intentionally bounces back to `/`).
- **Dark background on standalone pages**: a leftover `prefers-color-scheme: dark` rule in `app/globals.css` swapped the page to a near-black background with light text on any OS/browser set to dark mode. The dashboard never showed this (its shell hardcodes a light background), but standalone pages outside it — onboarding and `/delete-account` — did, making their text unreadable. Removed; this app is light-only by design, on every surface.

## Undated — rebrand and UI rebuild (predates this changelog entry; added retroactively since it was never recorded)

### Changed

- **Rebrand: Latin Expressions → aka Move**, and a full UI rebuild from Material-UI to a custom Tailwind CSS + headless Radix UI component kit (`app/components/ui/` — `Button`, `TextInput`, `Select`, `Combobox`, `DatePicker`, `Dialog`, `Tabs`, `Checkbox`, `Switch`, `Chip`, `ClassChips`, `PriceListEditor`, `Table`, `Pagination`, `Alert`, `Toast`, `PageHeader`, `BackButton`). MUI, its theme (`app/theme.js`), and the old `app/components/inputs/` / standalone `AlertComponent`, `BackButton`, `DashboardAppBar`, `MainDrawer`, `CreditModal`, `ClassesTable`, `CurrentPeriod`, `TotalIncomePerPeriod` components were removed in favor of the new kit. Every dashboard form, list, and chart was rebuilt against it.
- **New public marketing site** at `/` (`NavBar`, `HeroLobe`, `FeatureLobe`, `PricingLobe`, `ClosingLobe` in `app/components/landing/`), replacing the previous landing page, with its own pricing section and "Start free" Google sign-in entry points.
- **Brand system**: three-token palette (`brand-pink` `#E8195E`, `brand-dark` `#1B0E1E`, `brand-cream` `#F7E7E2`), Fraunces for display/headline type, Source Sans 3 for everything functional — documented in the `tailwind-ui-kit` skill.

## 2026-07-27

### Added

- **Configurable studio timezone**: new "Timezone" setting on the admin Settings page, stored in the `settings` table (key `timezone`) via new `getTimezone()` / `saveTimezone()` helpers (default `America/Indiana/Indianapolis`). No database change was required — the `settings` table is a generic key/value store.

### Fixed

- **Wrong event price near midnight in US timezones**: event payments now decide whether to charge the regular **Event Price** or the day-of **Date of Event Price** using the studio's configured timezone instead of UTC. Previously `handleEventSelect` in `PaymentForm` derived "today" from `new Date().toISOString()` (UTC), which flipped the calendar day in the evening for US timezones and selected the wrong price. A new dependency-free `getTodayInTimezone(tz)` helper (`app/components/utils/utils.js`, via `Intl.DateTimeFormat`) computes the local date, and `PaymentForm` reads the configured timezone before deciding the amount.

## 2026-07-20

### Added

- **Create a private lesson from a student's profile**: the read-only student view (`StudentForm`) now has a "Create Private Lesson" button next to "Go To Update Student". It links to `/dashboard/private-lessons/new?studentId=<id>`; the new-lesson page reads the `studentId` param, fetches the student, and pre-selects them in the form via a new `presetStudent` prop on `PrivateLessonForm`.

- **Active/inactive status for private lessons**: new `is_active` column on `private_lessons` (SQL in `api/db.sql`, plus a recreated `private_lessons_view` exposing it). The private lessons table shows an Active/Inactive status chip and an Activate/Deactivate toggle button (new `setPrivateLessonActive()` API). A package is automatically marked inactive once all purchased lessons are consumed (`recordPrivateLessonUsed`), and existing fully-consumed packages are backfilled to inactive.

- **Private lesson studio fee**: new "Private Lesson Studio Fee" setting on the admin Settings page, stored in the `settings` table (key `private_lesson_studio_fee`) via new `getStudioFee()` / `saveStudioFee()` helpers. The private lesson reports now deduct this fee per class: the Class Log gains **Studio Fee** and **Net Pay** columns, and the Summary gains **Gross Pay** and **Studio Fees** columns so the deduction is explicit (Gross Pay − Studio Fees = Amount to Pay), with matching grand totals.

- **Pay an event with student credit**: when creating a payment for a student (`/dashboard/payments/[studentId]`), event payments now display the student's credit and can be paid with it. The credit UI in `PaymentForm` was extracted into a reusable `renderCreditFields()` helper and is now shown in event mode when a student is attached; selecting an event triggers the same "Use existing credit?" dialog used for class payments. On submit, the applied credit is deducted from the student's balance via `updateStudentCredit()`. The event-from-event-page flow (no student) is unchanged.

### Changed

- **Removed the delete action from private lessons**: the Delete button, its confirmation dialog, and the supporting handler/state were removed from the private lessons table (`app/dashboard/private-lessons/page.jsx`). The `deletePrivateLesson` API function remains available.

- **Copy previous schedule into new periods, advancing each class**: when creating a new period, the class schedule is pre-filled from the most recent period's schedule, preserving each class's day, time, and location. Each class is also **advanced to the next class in its `class_type` track** — the class with the smallest `order` strictly greater than the current one (e.g. class_type 1 / order 3 → order 4) — so a new period picks up where students left off. Classes with no successor stay as-is. The new-period page (`app/dashboard/periods/new/page.jsx`) fetches the latest period via `getLatestPeriod()`, its schedule via `getScheduleByPeriod()`, and all classes via `getAllClasses()`, then remaps class ids with the new `buildNextClassMap()` helper (`api/class/class.js`) before passing the schedule to `PeriodForm` through its `existingSchedule` prop. `getAllClasses()` now also returns `class_type` and `order`. The copied slots are fully editable before saving; only `day_of_week`, `class_time`, `class_id`, and `location_id` are carried over (no stale row IDs).

## 2026-07-06

### Added

- **Account deletion (Google Play compliance)**: students can now delete their account in the aka Move mobile app (Profile → Delete Account) and request deletion on the web at `/delete-account`. New server routes: `app/api/account/delete` (deletes the auth user + profile, requires the caller's Supabase access token) and `app/api/account/delete-request` (records requests from the public page into a new `deletion_requests` table, service-role only). New server-only Supabase admin client in `lib/supabase/admin.js`; requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and the hosting environment. The mobile app reads the dashboard base URL from `EXPO_PUBLIC_API_URL`.

## 2026-07-03

### Added

- **Default pricing in Settings**: the admin Settings page now manages a default price list, stored in a new `settings` key/value table in Supabase (key `default_prices`). When creating a new period, the pricing section is pre-filled with these defaults (still editable per period). The period pricing UI was extracted into a reusable `PriceListEditor` component (`app/components/inputs/PriceListEditor.jsx`) shared by `PeriodForm` and the Settings page. New API module: `api/settings/settings.js`.

- **Settings in the admin navigation**: new "Settings" entry in the admin section of the dashboard sidebar (`DashboardNavbar`), visible to admins only, linking to a new admin-only page at `/dashboard/settings` (placeholder for future settings).
