---
status: idea
priority: medium
depends_on: [001-punch-pass, 003-native-student-apps]
---
# Student check-in (app + appless)

## Goal
Record when a student attends a class. Check-in must work **with the app** and also
**without it** (appless), so studios can use it before every student has the app. When the
student has an active punch pass, each check-in also punches it (→ 001).

## Stories — appless (can ship before the app)
- [ ] Staff check-in from the dashboard: pick a class session, tap students to mark them present
- [ ] Kiosk / tablet mode: the student types their name, email, or phone at the front desk
- [ ] Studio QR code at the door → web page where the student identifies themselves (no install)
- [ ] Attendance data model: `attendance` (student, class, period, location, timestamp, method, tenant_id)
- [ ] Check-in on a punch-pass student automatically records a punch (one transaction)

## Stories — in-app (after 003)
- [ ] Student scans the studio QR in the app, or taps "Check in" for a class happening now
- [ ] Show the remaining punch-pass balance after check-in
- [ ] Optional: geofence / time-window check to prevent remote check-ins

## Stories — reporting
- [ ] Attendance per class / per student on the dashboard
- [ ] Flag students attending without an active payment or pass

## Open questions
- Does check-in require a paid period or a pass, or does it just record attendance and flag problems?
- What anti-abuse measures are needed for the appless QR flow (rotating codes, staff confirmation)?
- Does the check-in window open before class (e.g. 15 min before → 15 min after start)?
