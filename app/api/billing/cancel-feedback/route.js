import supabaseAdmin from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { BillingError, billingRoute } from "@/lib/billing/route";

// Same values as cancellation_feedback.reason (migration 015) and
// Stripe's cancellation_details.feedback.
const REASONS = [
  "too_expensive",
  "missing_features",
  "switched_service",
  "unused",
  "too_complex",
  "low_quality",
  "customer_service",
  "other",
];

// The optional survey after cancelling. Saved in our table and copied to
// the Stripe subscription; the cancel itself already happened, so a
// failure to reach Stripe here is logged, not shown.
export const POST = billingRoute("cancel-feedback", async ({ body, user, tenant, billing }) => {
  const reason = body.reason;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
  if (!REASONS.includes(reason)) throw new BillingError(400, "Pick a reason.");

  const cancelling =
    billing?.stripe_subscription_id && (billing.cancel_at_period_end || billing.status === "canceled");
  if (!cancelling) throw new BillingError(409, "Your membership isn't cancelled.");

  // One answer per cancellation; a resubmit (double click) is a no-op.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("cancellation_feedback")
    .select("id")
    .eq("stripe_subscription_id", billing.stripe_subscription_id)
    .limit(1);
  if (existingError) throw existingError;
  if (existing.length) return { saved: true };

  const { error } = await supabaseAdmin.from("cancellation_feedback").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    stripe_subscription_id: billing.stripe_subscription_id,
    from_plan: billing.plan,
    reason,
    comment: comment || null,
  });
  if (error) throw error;

  try {
    await getStripe().subscriptions.update(billing.stripe_subscription_id, {
      cancellation_details: { feedback: reason, comment: comment || undefined },
    });
  } catch (stripeError) {
    console.error("[billing] couldn't copy cancel feedback to Stripe", stripeError);
  }

  return { saved: true };
});
