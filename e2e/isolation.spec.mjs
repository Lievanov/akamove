import { test, expect } from "@playwright/test";
import { USERS } from "./fixtures.mjs";
import { createClient } from "@supabase/supabase-js";
import { clientAs } from "./helpers.mjs";

// Row Level Security: a studio's users only ever see that studio's rows.
// No browser needed — these call Supabase directly as each fake user.
const TABLES = ["student", "class", "period", "payment", "location", "instructors", "events", "punch_pass", "notes", "settings"];

// Everything reachable through the REST API (tables + views).
const ALL_RELATIONS = [
  "cancellation_feedback", "class", "class_type", "deletion_requests", "event_payment", "events",
  "instructors", "location", "notes", "payment", "period", "period_auto_run", "period_location_class",
  "private_lesson_logs", "private_lessons", "profiles", "punch_pass", "punch_pass_entry",
  "punch_pass_type", "settings", "stripe_event", "student", "tenant", "tenant_billing", "tenant_invite",
  "trial_code", "trial_usage", "user_credit_balances", "user_tenant",
  "active_vs_nonactive_students_view", "all_students_by_last_payments_view", "class_period_student_count",
  "classes_by_student_view", "filtered_payment_view", "payment_by_student_view", "private_lessons_view",
  "student_count_by_period_id", "students_by_last_payments_view", "student_credit_balance",
];

const anon = () => createClient("http://127.0.0.1:54321", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

test.describe("tenant isolation (RLS)", () => {
  for (const table of TABLES) {
    test(`${table}: admin of one studio can't see another studio's rows`, async () => {
      const pro = await clientAs(USERS.proAdmin.email);
      const other = await clientAs(USERS.otherAdmin.email);

      const { data: proRows, error } = await pro.from(table).select("tenant_id");
      expect(error).toBeNull();
      const { data: otherRows } = await other.from(table).select("tenant_id");

      expect(proRows.length).toBeGreaterThan(0);
      const proTenants = new Set(proRows.map((r) => r.tenant_id));
      const otherTenants = new Set(otherRows.map((r) => r.tenant_id));
      expect(proTenants.size).toBe(1);
      expect([...proTenants].some((id) => otherTenants.has(id))).toBe(false);
    });
  }

  test("can't insert a row into another studio", async () => {
    const other = await clientAs(USERS.otherAdmin.email);
    const { data: [{ tenant_id: otherTenant }] } = await other.from("student").select("tenant_id").limit(1);

    const pro = await clientAs(USERS.proAdmin.email);
    const { error } = await pro.from("student").insert({ first_name: "Sneaky", last_name: "Insert", tenant_id: otherTenant });
    expect(error).not.toBeNull();
  });
});

test.describe("signed out (public anon key)", () => {
  for (const table of ALL_RELATIONS) {
    test(`${table}: returns no rows`, async () => {
      const { data } = await anon().from(table).select("*").limit(1);
      // Count views always return one row; all-zero counts mean nothing leaked.
      const leaked = (data ?? []).filter((row) => Object.values(row).some(Boolean));
      expect(leaked).toHaveLength(0);
    });
  }

  test("can't insert a payment", async () => {
    const { error } = await anon().from("payment").insert({ student_id: crypto.randomUUID(), classes: [], payment_amount: 1 });
    expect(error).not.toBeNull();
  });

  for (const fn of ["apply_stripe_subscription", "expire_due_trials", "auto_create_periods", "consume_trial_code", "create_tenant_and_admin", "accept_pending_invites"]) {
    test(`can't call ${fn}()`, async () => {
      const { error } = await anon().rpc(fn, {});
      expect(error).not.toBeNull();
    });
  }
});

// Every relation the API exposes, read from PostgREST's OpenAPI spec, so a
// table added later is tested without anyone remembering to list it.
async function exposedRelations() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch("http://127.0.0.1:54321/rest/v1/", { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const { definitions } = await res.json();
  return Object.entries(definitions).map(([name, def]) => ({ name, columns: Object.keys(def.properties ?? {}) }));
}

// Aggregate-only views: no row identity to compare across studios.
const NO_ROW_KEY = ["active_vs_nonactive_students_view"];

test.describe("RLS coverage", () => {
  test("every exposed table and view is in ALL_RELATIONS (so the anon test covers it)", async () => {
    const names = (await exposedRelations()).map((r) => r.name).sort();
    expect(names).toEqual([...ALL_RELATIONS].sort());
  });

  test("every row an admin sees belongs to their own studio", async () => {
    const pro = await clientAs(USERS.proAdmin.email);
    const other = await clientAs(USERS.otherAdmin.email);
    const { data: memberships } = await pro.from("user_tenant").select("tenant_id");
    const proTenants = new Set(memberships.map((m) => m.tenant_id));
    const failures = [];

    for (const { name, columns } of await exposedRelations()) {
      if (columns.includes("tenant_id")) {
        const { data } = await pro.from(name).select("tenant_id");
        const foreign = (data ?? []).filter((row) => !proTenants.has(row.tenant_id));
        if (foreign.length) failures.push(`${name}: ${foreign.length} row(s) from another studio`);
        continue;
      }
      if (NO_ROW_KEY.includes(name)) continue;
      // No tenant_id (views, profiles, tenant): the two studios' admins
      // must see disjoint rows.
      const key = ["id", "student_id", "period_id", "code"].find((c) => columns.includes(c));
      if (!key) {
        failures.push(`${name}: no tenant_id or row key — add it to NO_ROW_KEY with a reason, or test it by hand`);
        continue;
      }
      const [{ data: mine }, { data: theirs }] = await Promise.all([
        pro.from(name).select(key),
        other.from(name).select(key),
      ]);
      // Null keys are outer-join filler rows (e.g. payment_by_student_view's
      // classes with no payment), not shared rows.
      const theirKeys = new Set((theirs ?? []).map((row) => row[key]).filter((k) => k != null));
      const shared = (mine ?? []).filter((row) => theirKeys.has(row[key]));
      if (shared.length) failures.push(`${name}: ${shared.length} row(s) visible to both studios`);
    }

    expect(failures).toEqual([]);
  });
});

test.describe("profiles", () => {
  test("a user sees their own profile and their teammates, nobody else", async () => {
    const pro = await clientAs(USERS.proAdmin.email);
    const { data, error } = await pro.from("profiles").select("email");
    expect(error).toBeNull();
    const emails = data.map((p) => p.email).sort();
    expect(emails).toEqual([USERS.proAdmin.email, USERS.proStaff.email].sort());
  });

  test("a user can't edit someone else's profile", async () => {
    const staff = await clientAs(USERS.proStaff.email);
    const { data } = await staff.from("profiles").select("id").eq("email", USERS.proAdmin.email).single();
    const { data: updated } = await staff.from("profiles").update({ full_name: "Hacked" }).eq("id", data.id).select();
    expect(updated ?? []).toHaveLength(0);
  });
});

test.describe("role-scoped writes", () => {
  test("staff can read the studio's settings (timezone) but not change them", async () => {
    const staff = await clientAs(USERS.proStaff.email);
    const { data } = await staff.from("settings").select("key, tenant_id").eq("key", "timezone");
    expect(data).toHaveLength(1);
    const { data: updated } = await staff.from("settings").update({ value: "UTC" }).eq("key", "timezone").select();
    expect(updated ?? []).toHaveLength(0);
  });

  test("staff can't delete a student; admin can", async () => {
    const staff = await clientAs(USERS.proStaff.email);
    const admin = await clientAs(USERS.proAdmin.email);
    const { data: [student] } = await admin.from("student").insert({
      first_name: "Delete", last_name: "Me", tenant_id: (await admin.from("student").select("tenant_id").limit(1)).data[0].tenant_id,
    }).select();

    const { data: byStaff } = await staff.from("student").delete().eq("id", student.id).select();
    expect(byStaff ?? []).toHaveLength(0);
    const { data: byAdmin } = await admin.from("student").delete().eq("id", student.id).select();
    expect(byAdmin).toHaveLength(1);
  });

  test("a member can't move a row into another studio", async () => {
    const pro = await clientAs(USERS.proAdmin.email);
    const other = await clientAs(USERS.otherAdmin.email);
    const { data: [{ tenant_id: otherTenant }] } = await other.from("student").select("tenant_id").limit(1);
    const { data: [mine] } = await pro.from("payment").select("id").limit(1);
    const { error } = await pro.from("payment").update({ tenant_id: otherTenant }).eq("id", mine.id);
    expect(error).not.toBeNull();
  });
});
