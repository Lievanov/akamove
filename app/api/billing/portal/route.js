import { getStripe } from "@/lib/stripe";
import { BillingError, appUrl, billingRoute } from "@/lib/billing/route";

// Opens the Stripe Customer Portal (card, billing details, invoices —
// configured by scripts/stripe-setup.mjs). body.flow = "payment_method"
// lands straight on the update-card screen.
export const POST = billingRoute("portal", async ({ body, billing }) => {
  if (!billing?.stripe_customer_id) {
    throw new BillingError(409, "Your studio doesn't have billing set up yet.");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
    return_url: appUrl("/dashboard/settings/membership"),
    ...(body.flow === "payment_method" && { flow_data: { type: "payment_method_update" } }),
  });

  return { url: session.url };
});
