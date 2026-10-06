import supabase from "@/lib/supabase/client";

// Client side of the billing routes (app/api/billing/). Each call sends
// the user's Supabase access token and returns { data, error } with
// user-facing copy, like api/tenant/tenant.js. Some errors carry an
// `action` ("pay_invoice", "resume", "update_address") the UI can offer.

const OFFLINE = "Couldn't reach billing. Check your connection and try again.";

async function call(path, body) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`/api/billing/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { data: null, error: json.error ?? OFFLINE, action: json.action ?? null };
    }
    return { data: json, error: null, action: null };
  } catch (error) {
    console.error(`Error calling billing/${path}`, error);
    return { data: null, error: OFFLINE, action: null };
  }
}

// → { url } of a Stripe Checkout page.
export const startCheckout = (tenantId, plan, interval) =>
  call("checkout", { tenantId, plan, interval });

// → { url } of the Stripe Customer Portal. flow "payment_method" opens
// straight on the update-card screen.
export const openBillingPortal = (tenantId, flow) => call("portal", { tenantId, flow });

// → { kind, amountDue, tax, total, currency, prorationDate, effectiveAt, ... }
export const previewPlanChange = (tenantId, plan, interval) =>
  call("preview", { tenantId, plan, interval });

// → { status: "applied" | "scheduled" | "payment_required", invoiceUrl?, effectiveAt? }
export const changePlan = (tenantId, plan, interval, prorationDate) =>
  call("change-plan", { tenantId, plan, interval, prorationDate });

// → { immediate, endsAt }
export const cancelMembership = (tenantId) => call("cancel", { tenantId });

export const sendCancelFeedback = (tenantId, reason, comment) =>
  call("cancel-feedback", { tenantId, reason, comment });

export const resumeMembership = (tenantId) => call("resume", { tenantId });

// The studio's billing row (admins only, via RLS). Null before the first
// checkout or for staff.
export const getTenantBilling = async (tenantId) => {
  if (!tenantId) return null;
  try {
    const { data, error } = await supabase
      .from("tenant_billing")
      .select(
        "status, plan, billing_interval, current_period_end, cancel_at_period_end, scheduled_plan, scheduled_interval, scheduled_change_at, latest_invoice_url, payment_method_brand, payment_method_last4, stripe_subscription_id"
      )
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving billing", error);
    return null;
  }
};
