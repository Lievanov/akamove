---
status: idea
priority: medium
depends_on: []
---
# Native student apps (iOS / Android)

## Goal
A student-facing mobile app (iOS + Android) for aka Move studios. Its exact scope will be
defined in the stories below. The push notification infrastructure (`profiles.push_token`,
`app/api/notifications/*`) and account deletion flow already anticipate this app.

## Stories — planning
- [ ] Decide on the tech stack (Expo / React Native fits the existing Expo push setup)
- [ ] Define the MVP feature set (see candidate features below)
- [ ] Auth: Google OAuth + email/password, linking `profiles` ↔ `student` by email
- [ ] Multi-tenant: how a student finds or joins their studio (invite link, studio code, email match)
- [ ] RLS review: what students can read and write (their own data only)
- [ ] App Store / Play Store accounts, privacy policy, and in-app account deletion

## Candidate features (to prioritize)
- [ ] View schedule: current period's classes, locations, times
- [ ] My classes and enrollments
- [ ] Payment history and amounts owed
- [ ] Punch pass balance and history (→ 001)
- [ ] Check-in (→ 004)
- [ ] Events: browse and see pricing (advance vs. day-of)
- [ ] Book private lessons
- [ ] Push notifications: new period live, events, reminders
- [ ] In-app payments (Stripe), with store-policy implications to check

## Open questions
- One app for all studios (white-label-free), or branded per studio?
- Can students pay in the app, or is the app view-only for v1?
