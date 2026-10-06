import { changePlan } from "@/lib/billing/changes";
import { billingRoute } from "@/lib/billing/route";

// Switch a subscribed studio to body.plan / body.interval. Upgrades apply
// now; downgrades at the period end. Moving to Starter is cancel/, not
// this route.
export const POST = billingRoute("change-plan", ({ body, billing }) => changePlan(billing, body));
