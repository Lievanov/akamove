#!/usr/bin/env node
//
// Seeds the LOCAL Supabase (`supabase start`) with fake studios, users and
// sample data for tests — see e2e/fixtures.mjs for what gets created.
//
//   npm run test:seed          # reset the local DB, then seed
//
// Runs with the service-role key (bypasses RLS), so it refuses to run
// against anything but localhost.

import { createClient } from "@supabase/supabase-js";
import { PASSWORD, STUDIOS, USERS, PENDING_INVITES, SAMPLE } from "../../e2e/fixtures.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
  console.error(`Refusing to seed ${url || "(no NEXT_PUBLIC_SUPABASE_URL)"} — local Supabase only.`);
  process.exit(1);
}

const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Every dashboard tour, marked seen, so tours don't cover the page in tests.
const ALL_TOURS = [
  "staff-welcome", "settings", "locations", "classes", "classes-update",
  "periods", "period-form", "students", "payments", "events",
];

const DAY = 24 * 60 * 60 * 1000;
const iso = (d) => d.toISOString().slice(0, 10);

async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

const insert = (table, rows) => q(db.from(table).insert(rows).select());

async function createUser({ email, name }) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user;
}

function tenantRow({ name, plan, trial }) {
  const now = Date.now();
  const row = { name, plan };
  if (trial === "active") {
    Object.assign(row, {
      trial_status: "active",
      trial_started_at: new Date(now - 2 * DAY).toISOString(),
      trial_ends_at: new Date(now + 12 * DAY).toISOString(),
    });
  } else if (trial === "expired") {
    Object.assign(row, {
      trial_status: "expired",
      trial_started_at: new Date(now - 20 * DAY).toISOString(),
      trial_ends_at: new Date(now - 6 * DAY).toISOString(),
    });
  }
  return row;
}

async function seedStudioData(tenant_id, adminId) {
  const t = (rows) => rows.map((r) => ({ ...r, tenant_id }));

  await insert("settings", t([
    { key: "timezone", value: SAMPLE.timezone },
    { key: "default_prices", value: SAMPLE.defaultPrices },
    { key: "onboarding_checklist_dismissed", value: true },
  ]));

  const locations = await insert("location", t(SAMPLE.locations));
  const types = await insert("class_type", t(SAMPLE.classTypes.map((name) => ({ name }))));
  const typeId = Object.fromEntries(types.map((ct) => [ct.name, ct.id]));
  const classes = await insert("class", t(SAMPLE.classes.map((c, i) => ({
    name: c.name, level: c.level, order: i, class_type: typeId[c.type],
  }))));
  const instructors = await insert("instructors", t(SAMPLE.instructors.map((name) => ({ name }))));

  // Current month as the live period, with a weekly schedule.
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [period] = await insert("period", t([{
    name: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
    start_date: iso(start),
    end_date: iso(end),
    classes: classes.map((c) => c.id),
    prices: SAMPLE.defaultPrices,
    is_current: true,
  }]));
  await insert("period_location_class", t([
    { period_id: period.id, location_id: locations[0].id, class_id: classes[0].id, day_of_week: "Monday", class_time: "18:00", sort_order: 0 },
    { period_id: period.id, location_id: locations[0].id, class_id: classes[2].id, day_of_week: "Monday", class_time: "19:00", sort_order: 1 },
    { period_id: period.id, location_id: locations[1].id, class_id: classes[1].id, day_of_week: "Wednesday", class_time: "18:30", sort_order: 0 },
    { period_id: period.id, location_id: locations[1].id, class_id: classes[3].id, day_of_week: "Thursday", class_time: "19:30", sort_order: 0 },
  ]));

  const students = await insert("student", t(SAMPLE.students.map((s) => ({
    is_active: true, ...s, classes: [],
  }))));
  const [ana, ben, chloe] = students;

  await insert("payment", t([
    { student_id: ana.id, period_id: period.id, classes: [classes[0].id], payment_amount: 60, payment_method: "Card" },
    { student_id: ben.id, period_id: period.id, classes: [classes[1].id, classes[3].id], payment_amount: 110, payment_method: "Cash" },
  ]));

  const passTypes = await insert("punch_pass_type", t(SAMPLE.punchPassTypes));
  const [pass] = await insert("punch_pass", t([{
    student_id: chloe.id,
    pass_type_id: passTypes[0].id,
    name: passTypes[0].name,
    total_entries: passTypes[0].total_entries,
    price: passTypes[0].price,
    payment_method: "Card",
    expires_on: iso(new Date(Date.now() + 60 * DAY)),
    created_by: adminId,
  }]));
  await insert("punch_pass_entry", t([
    { punch_pass_id: pass.id, class_id: classes[0].id, location_id: locations[0].id, recorded_by: adminId },
  ]));

  const [event] = await insert("events", t([{
    event_name: "Social Night",
    event_date: iso(new Date(Date.now() + 14 * DAY)),
    event_price: 15,
    date_of_event_price: 20,
  }]));
  await insert("event_payment", t([
    { event_id: event.id, payment_date: iso(now), payment_amount: 15, client_name: "Ana Lopez", student_id: ana.id },
  ]));

  const [lesson] = await insert("private_lessons", t([{
    student_id: ben.id,
    instructor_id: instructors[0].id,
    lessons_purchased: 4,
    lessons_used: 1,
    date_purchased: iso(now),
    amount: 200,
  }]));
  await insert("private_lesson_logs", t([
    { private_lesson_id: lesson.id, instructor_id: instructors[0].id },
  ]));

  await insert("notes", t([{ note: "Call Diego about his schedule", user_id: adminId }]));
}

// Right after `supabase db reset` the REST API is still reloading its
// schema cache for a few seconds.
async function waitForApi() {
  for (let i = 0; i < 30; i += 1) {
    const { error } = await db.from("tenant").select("id").limit(1);
    if (!error) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Supabase API not ready after 30s");
}

async function main() {
  await waitForApi();
  const tenants = {};
  for (const [key, studio] of Object.entries(STUDIOS)) {
    [tenants[key]] = await insert("tenant", [tenantRow(studio)]);
  }

  const users = {};
  for (const [key, u] of Object.entries(USERS)) {
    const user = await createUser(u);
    users[key] = user;
    await q(db.from("profiles").update({
      tours_seen: ALL_TOURS,
      ...(u.profileRole ? { role: u.profileRole } : {}),
    }).eq("id", user.id));
    if (u.studio) {
      await insert("user_tenant", [{ user_id: user.id, tenant_id: tenants[u.studio].id, role: u.role }]);
    }
  }

  const invites = [
    ...Object.values(USERS).filter((u) => u.invite).map((u) => ({ email: u.email, ...u.invite })),
    ...PENDING_INVITES,
  ];
  for (const inv of invites) {
    const tenant = tenants[inv.studio];
    const admin = Object.entries(USERS).find(([, u]) => u.studio === inv.studio && u.role === "admin");
    await insert("tenant_invite", [{
      tenant_id: tenant.id,
      email: inv.email,
      role: inv.role,
      invited_by: users[admin[0]].id,
      expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
    }]);
  }

  for (const [key, tenant] of Object.entries(tenants)) {
    const admin = Object.entries(USERS).find(([, u]) => u.studio === key && u.role === "admin");
    await seedStudioData(tenant.id, users[admin[0]].id);
  }

  console.log(`Seeded ${Object.keys(tenants).length} studios and ${Object.keys(users).length} users (password: ${PASSWORD}).`);
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
