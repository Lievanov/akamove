import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

// Deletes the authenticated user's account. Called by the mobile app with
// the user's Supabase access token as a Bearer token. Payment and student
// records are retained for bookkeeping; the login account, profile and
// push token are removed.
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

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (profileError) throw profileError;

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
