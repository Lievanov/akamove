// Fake studios and users for tests. Shared by the seed script
// (scripts/test/seed.mjs) and the Playwright specs, so both agree on
// emails, passwords and studio names. Everything uses the reserved
// `.test` TLD — these addresses can never reach a real inbox.

export const PASSWORD = "Test1234!";

export const STUDIOS = {
  pro: { name: "Test Pro Studio", plan: "pro studio", trial: "active" },
  studio: { name: "Test Studio", plan: "studio" },
  starter: { name: "Test Starter Studio", plan: "starter", trial: "expired" },
  // A second paid studio, only so tests can check one studio can't see
  // another's data.
  other: { name: "Other Studio", plan: "pro studio" },
};

// key → user. `studio` + `role` become a user_tenant row.
export const USERS = {
  proAdmin: { email: "admin@pro.akamove.test", name: "Pro Admin", studio: "pro", role: "admin" },
  proStaff: { email: "staff@pro.akamove.test", name: "Pro Staff", studio: "pro", role: "staff" },
  studioAdmin: { email: "admin@studio.akamove.test", name: "Studio Admin", studio: "studio", role: "admin" },
  studioStaff: { email: "staff@studio.akamove.test", name: "Studio Staff", studio: "studio", role: "staff" },
  starterAdmin: { email: "admin@starter.akamove.test", name: "Starter Admin", studio: "starter", role: "admin" },
  starterStaff: { email: "staff@starter.akamove.test", name: "Starter Staff", studio: "starter", role: "staff" },
  otherAdmin: { email: "admin@other.akamove.test", name: "Other Admin", studio: "other", role: "admin" },
  // Signed up, no studio yet → onboarding.
  noStudio: { email: "new@akamove.test", name: "New Owner" },
  // Has a pending invite to Test Studio (staff) → attached on first login.
  invited: { email: "invited@akamove.test", name: "Invited Staff", invite: { studio: "studio", role: "staff" } },
  // profiles.role = 'student' → bounced off the dashboard.
  student: { email: "student@akamove.test", name: "Student User", profileRole: "student" },
};

// Invites for addresses with no account yet — used by sign-up tests.
export const PENDING_INVITES = [
  { email: "invite-signup@akamove.test", studio: "pro", role: "staff" },
];

// Users that get a saved login (Playwright storageState) in auth.setup.
export const LOGIN_ROLES = [
  "proAdmin",
  "proStaff",
  "studioAdmin",
  "studioStaff",
  "starterAdmin",
  "starterStaff",
];

export const authFile = (key) => `e2e/.auth/${key}.json`;

// Sample data seeded into every studio (names are prefixed with the
// studio key in `other`, so isolation tests can tell them apart).
export const SAMPLE = {
  students: [
    { first_name: "Ana", last_name: "Lopez", email: "ana@student.akamove.test" },
    { first_name: "Ben", last_name: "Carter", email: "ben@student.akamove.test" },
    { first_name: "Chloe", last_name: "Nguyen", email: "chloe@student.akamove.test" },
    { first_name: "Diego", last_name: "Ramos", email: "diego@student.akamove.test" },
    { first_name: "Eva", last_name: "Inactive", email: "eva@student.akamove.test", is_active: false },
  ],
  classTypes: ["Salsa", "Bachata"],
  classes: [
    { name: "Salsa 1", level: 1, type: "Salsa" },
    { name: "Salsa 2", level: 2, type: "Salsa" },
    { name: "Bachata 1", level: 1, type: "Bachata" },
    { name: "Bachata 2", level: 2, type: "Bachata" },
  ],
  instructors: ["Maria Instructor", "Carlos Instructor"],
  locations: [
    { name: "Downtown", address: "100 Main St" },
    { name: "Northside", address: "200 North Ave" },
  ],
  defaultPrices: [60, 110, 150],
  punchPassTypes: [
    { name: "5-class pass", total_entries: 5, price: 75, validity_days: 60 },
    { name: "10-class pass", total_entries: 10, price: 140, validity_days: 90 },
  ],
  timezone: "America/Indiana/Indianapolis",
};
