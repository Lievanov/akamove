import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly safety net for anything a lost or failed webhook left out of
// sync: re-syncs every live subscription from Stripe, and picks up
// checkouts that were paid but whose webhook never landed.
//
// Scheduled daily in vercel.json. Vercel Cron calls it with
// `Authorization: Bearer $CRON_SECRET` once that env var is set.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { synced: 0, recoveredCheckouts: 0, failed: [] };

  const { data: rows, error } = await supabaseAdmin
    .from("tenant_billing")
    .select("tenant_id, stripe_subscription_id, status, checkout_session_id");
  if (error) {
    console.error("[billing] reconcile: couldn't read tenant_billing", error);
    return NextResponse.json({ error: "Couldn't read billing" }, { status: 500 });
  }

  for (const row of rows) {
    try {
      if (row.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(row.status)) {
        await syncSubscription(row.stripe_subscription_id);
        results.synced += 1;
      } else if (row.checkout_session_id) {
        const session = await getStripe().checkout.sessions.retrieve(row.checkout_session_id);
        if (session.status === "complete" && session.subscription) {
          await syncSubscription(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id
          );
          results.recoveredCheckouts += 1;
        }
      }
    } catch (rowError) {
      console.error(`[billing] reconcile failed for studio ${row.tenant_id}`, rowError);
      results.failed.push(row.tenant_id);
    }
  }

  console.log("[billing] reconcile", JSON.stringify(results));
  return NextResponse.json(results);
}
