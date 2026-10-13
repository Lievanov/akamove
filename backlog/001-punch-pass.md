---
status: in-progress
priority: high
depends_on: []
---
# Punch pass (stamp card)

## Goal
A student can buy a pass for a fixed number of entries (e.g. 10). The studio tracks
each entry against the pass so everyone can see how many are used and how many are left.
This is an alternative to paying for a full period of classes.

## Stories
- [x] Data model: `punch_pass` (student, total entries, price, purchase date, optional expiry, tenant_id)
      and `punch_pass_entry` (pass, date/time, class/location, recorded by)
- [x] Settings: define pass types (e.g. 5 / 10 / 20 entries, price, validity in days)
- [x] Sell a pass to a student from the student's page (records the price and payment method on the pass)
- [x] Sell a pass from Payments: the Record payment card has Classes / Event / Punch pass tabs
      (the Payments list row menu's "Sell punch pass" opens on that tab); afterwards it goes to
      the student's page
- [x] Record an entry ("punch") from the dashboard, which decrements the remaining count
- [x] Undo or correct a punch made by mistake
- [x] Student detail: active pass, remaining entries, entry history
- [x] Block or warn when the pass is used up or expired; offer a renewal
- [x] Include pass sales in reports (period report → revenue summary → Punch Passes)
- [x] List pass sales under Payments → Punch passes (search by student or pass; status and entries used)

Remaining before `done`: run migration 019 (`api/db/migrations/README.md`, Phase 12) and check
the flow by hand: sell a pass, punch, correct and undo a punch, extend an expired pass, and see
the sale under Periods → report → Punch Passes.

## Decisions (2026-10-12)
- **Expiry:** optional. Each pass type can set a validity in days, which pre-fills the pass's
  expiry date; staff can change or remove that date on a sold pass (that's how expiry is extended).
- **Scope:** a pass is valid for any class. Class and location on a punch are optional, for the record only.
- **Several passes:** a student can buy a new pass before the current one runs out. Passes are
  used in the order they were bought: the oldest usable pass first, then the next
  (`record_punch` in migration 019). An expired pass is skipped.
- **Sharing:** no, a pass belongs to one student.
- **Payments:** a pass sale is not a `payment` row. `punch_pass` holds its own price and payment
  method (like `private_lessons`), and reports add it as its own revenue line. Pass sales have
  their own Payments tab (Punch passes) rather than appearing in the payments list.
- **Used up / expired:** punching is refused (`no_active_pass`). The student page offers
  "Sell new pass", plus "Extend expiry" when an expired pass still had entries left.
