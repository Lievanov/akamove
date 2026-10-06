import { resumeSubscription } from "@/lib/billing/changes";
import { billingRoute } from "@/lib/billing/route";

// Undo a pending cancel or scheduled downgrade.
export const POST = billingRoute("resume", ({ billing }) => resumeSubscription(billing));
