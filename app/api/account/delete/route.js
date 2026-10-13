import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

// Deletes the authenticated user's account. Called by the mobile app with
// the user's Supabase access token as a Bearer token. Payment and student
// records are retained for bookkeeping; the login account, profile
// (cascades) and studio memberships are removed.
//
// A studio's only admin is refused (409 sole_admin): deleting them would
// leave the studio, and any subscription it pays for, with nobody who can
// manage it. They promote another admin first, or contact support.
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
    }

    const soleAdminOf = await studiosWithOnlyAdmin(user.id);
    if (soleAdminOf.length > 0) {
      return NextResponse.json(
        {
          error: "sole_admin",
          message: "You're the only admin of a studio. Make someone else an admin first, or contact support.",
          studios: soleAdminOf,
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

// Names of the studios where this user is the only admin.
async function studiosWithOnlyAdmin(userId) {
  const { data: adminOf, error } = await supabaseAdmin
    .from("user_tenant")
    .select("tenant_id, tenant(name)")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw error;
  if (!adminOf?.length) return [];

  const { data: admins, error: adminsError } = await supabaseAdmin
    .from("user_tenant")
    .select("tenant_id")
    .in("tenant_id", adminOf.map((row) => row.tenant_id))
    .eq("role", "admin");
  if (adminsError) throw adminsError;

  const adminCount = new Map();
  for (const { tenant_id } of admins) adminCount.set(tenant_id, (adminCount.get(tenant_id) ?? 0) + 1);
  return adminOf.filter((row) => adminCount.get(row.tenant_id) === 1).map((row) => row.tenant?.name ?? row.tenant_id);
}
