import { cancelSubscription } from "@/lib/billing/changes";
import { billingRoute } from "@/lib/billing/route";

// Cancel the membership: Starter at the end of the paid period. Takes
// effect before the (optional) survey, which posts to cancel-feedback/.
export const POST = billingRoute("cancel", ({ billing }) => cancelSubscription(billing));
