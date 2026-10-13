import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD } from "./fixtures.mjs";
import { clientAs, uniqueEmail } from "./helpers.mjs";

// POST /api/account/delete. Each test makes its own throwaway user and
// studio with the service role, so the seeded fixtures stay untouched.
const admin = () =>
  createClient("http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function makeUser(prefix) {
  const email = uniqueEmail(prefix);
  const { data, error } = await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const client = await clientAs(email);
  const { data: { session } } = await client.auth.getSession();
  return { id: data.user.id, email, token: session.access_token };
}

async function makeStudio(name) {
  const { data, error } = await admin().from("tenant").insert({ name, plan: "studio" }).select("id").single();
  if (error) throw error;
  return data.id;
}

const deleteAccount = (request, token) =>
  request.post("/api/account/delete", { headers: { Authorization: `Bearer ${token}` } });

test.describe("account deletion", () => {
  test("needs a valid token", async ({ request }) => {
    expect((await request.post("/api/account/delete")).status()).toBe(401);
    expect((await deleteAccount(request, "not-a-token")).status()).toBe(401);
  });

  test("works for someone who sent an invite; the invite stays with the studio", async ({ request }) => {
    const db = admin();
    const studioId = await makeStudio("Deletion Invite Studio");
    const owner = await makeUser("delete-owner");
    const leaver = await makeUser("delete-leaver");
    await db.from("user_tenant").insert([
      { user_id: owner.id, tenant_id: studioId, role: "admin" },
      { user_id: leaver.id, tenant_id: studioId, role: "admin" },
    ]);
    const { data: invite } = await db
      .from("tenant_invite")
      .insert({ tenant_id: studioId, email: uniqueEmail("delete-invitee"), invited_by: leaver.id })
      .select("id")
      .single();

    const response = await deleteAccount(request, leaver.token);
    expect(response.status()).toBe(200);

    const { data: user } = await db.auth.admin.getUserById(leaver.id);
    expect(user?.user ?? null).toBeNull();
    const { data: kept } = await db.from("tenant_invite").select("invited_by").eq("id", invite.id).single();
    expect(kept.invited_by).toBeNull();

    await db.auth.admin.deleteUser(owner.id);
    await db.from("tenant").delete().eq("id", studioId);
  });

  test("refuses a studio's only admin", async ({ request }) => {
    const db = admin();
    const studioId = await makeStudio("Deletion Sole Admin Studio");
    const soleAdmin = await makeUser("delete-sole");
    await db.from("user_tenant").insert({ user_id: soleAdmin.id, tenant_id: studioId, role: "admin" });

    const response = await deleteAccount(request, soleAdmin.token);
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("sole_admin");
    expect(body.studios).toEqual(["Deletion Sole Admin Studio"]);

    const { data: user } = await db.auth.admin.getUserById(soleAdmin.id);
    expect(user.user.id).toBe(soleAdmin.id);

    await db.auth.admin.deleteUser(soleAdmin.id);
    await db.from("tenant").delete().eq("id", studioId);
  });

  test("notification routes are gone", async ({ request }) => {
    for (const path of ["/api/notifications/period", "/api/notifications/event"]) {
      expect((await request.post(path, { data: { name: "spam" } })).status()).toBe(404);
    }
  });
});
