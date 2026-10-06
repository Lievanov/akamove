import supabaseAdmin from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { planFromPrice } from "./prices";

// Server-only. Mirrors a Stripe subscription into tenant_billing and
// tenant.plan. Always works from a fresh copy fetched from the API —
// never from a webhook payload — so events arriving late or out of
// order can't leave stale state behind.

const SUBSCRIPTION_EXPAND = [
  "items.data.price",
  "schedule.phases.items.price",
  "latest_invoice",
  "default_payment_method",
  "customer.invoice_settings.default_payment_method",
];

const toDate = (seconds) => (seconds ? new Date(seconds * 1000).toISOString() : null);
const idOf = (value) => (typeof value === "string" ? value : value?.id ?? null);

const isLiveSchedule = (schedule) =>
  !!schedule && typeof schedule === "object" && ["active", "not_started"].includes(schedule.status);

// The phase a Subscription Schedule hasn't reached yet — a downgrade
// waiting for the period end. Read off the schedule's own current_phase,
// not the wall clock (test clocks run ahead of it). After the switch the
// schedule stays attached for its last phase with nothing pending.
export function pendingSchedulePhase(schedule) {
  if (!isLiveSchedule(schedule)) return null;
  const from = schedule.current_phase?.end_date ?? Math.floor(Date.now() / 1000);
  return schedule.phases?.find((phase) => phase.start_date >= from) ?? null;
}

function scheduledChange(schedule) {
  const next = pendingSchedulePhase(schedule);
  const target = next && planFromPrice(next.items?.[0]?.price);
  return target ? { ...target, at: next.start_date } : null;
}

function paymentMethodSummary(subscription) {
  const pm =
    (typeof subscription.default_payment_method === "object" && subscription.default_payment_method) ||
    subscription.customer?.invoice_settings?.default_payment_method;
  if (!pm || typeof pm === "string") return { brand: null, last4: null };
  if (pm.card) return { brand: pm.card.brand, last4: pm.card.last4 };
  return { brand: pm.type, last4: pm.us_bank_account?.last4 ?? null };
}

// Pure: a subscription (fetched with SUBSCRIPTION_EXPAND) → the arguments
// for apply_stripe_subscription plus the display-only card fields.
// Returns null for a subscription that isn't on one of our prices.
export function billingFromSubscription(subscription) {
  const item = subscription.items?.data?.[0];
  const current = planFromPrice(item?.price);
  if (!current) return null;

  const scheduled = scheduledChange(subscription.schedule);
  const invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
  // "Pay now" link: an open invoice we're waiting on — a failed renewal,
  // or an upgrade held back by pending_if_incomplete.
  const owesInvoice =
    invoice?.status === "open" &&
    (["past_due", "incomplete", "unpaid"].includes(subscription.status) || !!subscription.pending_update);
  const card = paymentMethodSummary(subscription);

  return {
    rpc: {
      p_customer_id: idOf(subscription.customer),
      p_subscription_id: subscription.id,
      p_status: subscription.status,
      p_price_id: item.price.id,
      p_plan: current.plan,
      p_interval: current.interval,
      p_current_period_end: toDate(item.current_period_end),
      p_cancel_at_period_end: !!subscription.cancel_at_period_end || !!subscription.cancel_at,
      p_scheduled_plan: scheduled?.plan ?? null,
      p_scheduled_interval: scheduled?.interval ?? null,
      p_scheduled_change_at: toDate(scheduled?.at),
      p_latest_invoice_url: owesInvoice ? invoice.hosted_invoice_url : null,
    },
    card,
  };
}

// The studio a Stripe object belongs to: our metadata first, then the
// billing row that holds the customer.
export async function tenantIdFor({ metadata, customer }) {
  if (metadata?.tenant_id) return metadata.tenant_id;
  if (typeof customer === "object" && customer?.metadata?.tenant_id) return customer.metadata.tenant_id;
  const customerId = idOf(customer);
  if (!customerId) return null;
  const { data, error } = await supabaseAdmin
    .from("tenant_billing")
    .select("tenant_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data?.tenant_id ?? null;
}

// Fetches the subscription and writes it through. Returns the updated
// tenant row, or null when there's nothing of ours to sync (unknown
// studio, foreign price, billing-exempt studio) — logged, not thrown, so
// a webhook doesn't retry something that will never succeed.
export async function syncSubscription(subscriptionId) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: SUBSCRIPTION_EXPAND,
  });

  const tenantId = await tenantIdFor(subscription);
  if (!tenantId) {
    console.warn(`[billing] no studio for subscription ${subscriptionId}`);
    return null;
  }

  const mapped = billingFromSubscription(subscription);
  if (!mapped) {
    console.warn(`[billing] subscription ${subscriptionId} isn't on an aka Move price`);
    return null;
  }

  const { data: tenant, error } = await supabaseAdmin.rpc("apply_stripe_subscription", {
    p_tenant_id: tenantId,
    ...mapped.rpc,
  });
  if (error) {
    if (["billing_exempt", "tenant_not_found"].includes(error.message)) {
      console.warn(`[billing] skipped subscription ${subscriptionId}: ${error.message}`);
      return null;
    }
    throw error;
  }

  // Card details, and the checkout session is used up once a
  // subscription exists.
  const { error: cardError } = await supabaseAdmin
    .from("tenant_billing")
    .update({
      payment_method_brand: mapped.card.brand,
      payment_method_last4: mapped.card.last4,
      checkout_session_id: null,
      checkout_session_expires_at: null,
    })
    .eq("tenant_id", tenantId)
    .eq("stripe_subscription_id", subscriptionId);
  if (cardError) throw cardError;

  return tenant;
}
