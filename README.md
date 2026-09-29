# aka Move production

### 04/21/2026

- Private lessons reporting added 
- Amount paid per class added to the classes table (`/dashboard/classes`).
  - Payments with multiple classes split the cost proportionally per class
  - Multiple payments for the same student/class are summed
- `classes_by_student_view` updated to expose `class_id` and `period_id`
- Build error fixed: renamed `usePrivateLesson` → `recordPrivateLessonUsed` to comply with React hooks naming rules

### 2025

- Private lessons module added (`/dashboard/private-lessons`)
  - Create, view, and track lesson usage
  - Use Class dialog to record a lesson used and assign an instructor
  - Lesson logs per private lesson
- Instructors module added (`/dashboard/instructors`)
- Payment credit fixes and modal dialog for credits
- Gift certificate payment method added
- CSV export: last name shown first

### 2024

- Events module added (`/dashboard/events`) with event payments
- Payment reporting added per period
- Period filter added to classes view
- Global notes added
- Student credit system: credit auto-deducted from payment amount
- Class chips support double-click navigation
- Roles added (admin/user)
- Edit payment added
- Is dropout flag added to payments
- Email no longer required for students
- Payment screen reordered (classes → amount → method)
