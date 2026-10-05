-- Phase 8: onboarding — remember which page tours each user has seen.
--
-- The dashboard runs a short guided tour the first time someone opens
-- a page (see app/context/OnboardingContext.jsx). tours_seen holds the
-- ids of the tours this user has finished or skipped, e.g.
-- '["settings", "locations"]', so a tour follows the user across
-- devices instead of living in one browser's localStorage.
--
-- Per user, not per studio: someone who belongs to two studios has
-- already learned the pages once. The existing "Users can update own
-- profile." policy already lets a user write their own row.

alter table public.profiles
    add column tours_seen jsonb not null default '[]'::jsonb;

comment on column public.profiles.tours_seen is 'Ids of dashboard page tours this user has finished or skipped.';
