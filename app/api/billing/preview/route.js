import { previewChange } from "@/lib/billing/changes";
import { billingRoute } from "@/lib/billing/route";

// What switching to body.plan / body.interval would do — for the
// confirm dialog before change-plan.
export const POST = billingRoute("preview", ({ body, billing }) => previewChange(billing, body));
