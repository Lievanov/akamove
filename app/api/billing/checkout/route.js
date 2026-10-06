import supabaseAdmin from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getPriceId } from "@/lib/billing/prices";
import { syncSubscription } from "@/lib/billing/sync";
import { BILLING_INTERVALS, hasLiveSubscription, isPaidPlan } from "@/lib/billing/catalog.mjs";
import { BillingError, appUrl, billingRoute } from "@/lib/billing/route";

// Tags these sessions in the Stripe Dashboard (Checkout → integration).
const INTEGRATION_IDENTIFIER = "akamove-plan-checkout-mabjbudj";
// Stripe requires a Checkout trial_end at least 48 hours out; an hour of
// slack covers the time spent on the payment page.
const MIN_TRIAL_REMAINING_MS = 49 * 60 * 60 * 1000;

// Starts a subscription for a studio that doesn't have one: returns the
// URL of a Stripe Checkout page. The plan only changes once Stripe's
// webhook confirms payment — never from the redirect back.
//
// During an active free trial the subscription starts with
// trial_end = the trial's end, so the card is saved now and first
// charged when the trial would have ended.
export const POST = billingRoute("checkout", async ({ body, user, tenant, billing }) => {
  const { plan, interval } = body;
  if (!isPaidPlan(plan) || !BILLING_INTERVALS.includes(interval)) {
    throw new BillingError(400, "Pick a plan and billing period.");
  }
  if (tenant.billing_exempt) {
    throw new BillingError(409, "Your plan is managed by the aka Move team. Contact us to change it.");
  }
  if (hasLiveSubscription(billing)) {
    throw new BillingError(409, "Your studio already has a subscription. Change plans from the plan cards.");
  }

  const stripe = getStripe();

  // Reuse the open session for the same choice; expire one for a
  // different choice so only one checkout can ever be paid.
  if (billing?.checkout_session_id) {
    const open = await stripe.checkout.sessions
      .retrieve(billing.checkout_session_id)
      .catch(() => null);
    // Paid, but the webhook hasn't landed yet: sync now instead of
    // letting them pay twice.
    if (open?.status === "complete" && open.subscription) {
      await syncSubscription(typeof open.subscription === "string" ? open.subscription : open.subscription.id);
      throw new BillingError(409, "Your payment went through — your plan is activating. Refresh in a moment.");
    }
    if (open?.status === "open") {
      if (open.metadata?.plan === plan && open.metadata?.interval === interval) {
        return { url: open.url };
      }
      await stripe.checkout.sessions.expire(open.id).catch(() => null);
    }
  }

  let customerId = billing?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create(
      { email: user.email, name: tenant.name, metadata: { tenant_id: tenant.id } },
      { idempotencyKey: `customer-${tenant.id}` }
    );
    customerId = customer.id;
    const { error } = await supabaseAdmin
      .from("tenant_billing")
      .upsert({ tenant_id: tenant.id, stripe_customer_id: customerId }, { onConflict: "tenant_id" });
    if (error) throw error;
  }

  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
  const keepTrial =
    tenant.trial_status === "active" &&
    trialEndsAt &&
    trialEndsAt.getTime() - Date.now() >= MIN_TRIAL_REMAINING_MS;

  const metadata = { tenant_id: tenant.id, plan, interval };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: tenant.id,
    line_items: [{ price: await getPriceId(plan, interval), quantity: 1 }],
    subscription_data: {
      metadata: { tenant_id: tenant.id },
      ...(keepTrial && { trial_end: Math.floor(trialEndsAt.getTime() / 1000) }),
    },
    metadata,
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    customer_update: { address: "auto", name: "auto" },
    tax_id_collection: { enabled: true },
    integration_identifier: INTEGRATION_IDENTIFIER,
    success_url: appUrl("/dashboard/settings/membership?checkout=success"),
    cancel_url: appUrl("/dashboard/settings/membership?checkout=canceled"),
  });

  const { error } = await supabaseAdmin
    .from("tenant_billing")
    .update({
      checkout_session_id: session.id,
      checkout_session_expires_at: new Date(session.expires_at * 1000).toISOString(),
    })
    .eq("tenant_id", tenant.id);
  if (error) throw error;

  return { url: session.url };
});
