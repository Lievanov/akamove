import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Records an account deletion request from the public /delete-account page.
// Requests land in the deletion_requests table (service-role only) and are
// processed by an admin. Always responds with success for valid input so
// the endpoint doesn't reveal whether an account exists.
export async function POST(request) {
  try {
    const { email, reason } = await request.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("deletion_requests").insert({
      email: email.trim().toLowerCase(),
      reason: reason?.slice(0, 1000) || null,
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving deletion request", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
