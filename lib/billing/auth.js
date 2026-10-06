import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

const fail = (status, error) => ({ error: NextResponse.json({ error }, { status }) });

// Every billing route starts here. The browser sends the user's Supabase
// access token as a Bearer token (same as app/api/account/delete); this
// confirms the token, then that the user is an admin of `tenantId`, and
// loads the studio and its billing row with the service role.
//
// Returns { user, tenant, billing } — billing is null before the first
// checkout — or { error } holding the response to send back as-is:
//   const ctx = await requireTenantAdmin(request, tenantId);
//   if (ctx.error) return ctx.error;
export async function requireTenantAdmin(request, tenantId) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "You need to be logged in to manage billing.");

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) return fail(401, "Your session has expired. Log in again.");

  if (!tenantId) return fail(400, "Missing studio.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("user_tenant")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (membership?.role !== "admin") return fail(403, "Only studio admins can manage billing.");

  const [{ data: tenant, error: tenantError }, { data: billing, error: billingError }] =
    await Promise.all([
      supabaseAdmin
        .from("tenant")
        .select("id, name, plan, billing_exempt, trial_status, trial_ends_at")
        .eq("id", tenantId)
        .single(),
      supabaseAdmin.from("tenant_billing").select("*").eq("tenant_id", tenantId).maybeSingle(),
    ]);
  if (tenantError) throw tenantError;
  if (billingError) throw billingError;

  return { user, tenant, billing: billing ?? null };
}
