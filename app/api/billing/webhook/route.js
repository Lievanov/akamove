import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { syncSubscription, tenantIdFor } from "@/lib/billing/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe → us. The only path that changes a subscribed studio's plan
// (through syncSubscription → apply_stripe_subscription).
//
//   1. verify the signature against the raw body (bad → 400, not retried)
//   2. skip events already processed (stripe_event.processed_at)
//   3. work out which subscription the event is about and re-sync it
//      from the API — payloads are only used to find the id
//   4. mark processed → 200; anything thrown → 500 and Stripe retries
//      with backoff for up to 3 days

const subscriptionIdOf = (value) => (typeof value === "string" ? value : value?.id ?? null);

async function handle(event) {
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
      if (object.mode === "subscription" && object.subscription) {
        await syncSubscription(subscriptionIdOf(object.subscription));
      }
      return;

    case "checkout.session.expired": {
      const tenantId = object.client_reference_id ?? object.metadata?.tenant_id;
      if (!tenantId) return;
      const { error } = await supabaseAdmin
        .from("tenant_billing")
        .update({ checkout_session_id: null, checkout_session_expires_at: null })
        .eq("tenant_id", tenantId)
        .eq("checkout_session_id", object.id);
      if (error) throw error;
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.pending_update_applied":
    case "customer.subscription.pending_update_expired":
      await syncSubscription(object.id);
      return;

    case "subscription_schedule.updated":
    case "subscription_schedule.released":
    case "subscription_schedule.canceled":
    case "subscription_schedule.completed":
      if (object.subscription) await syncSubscription(subscriptionIdOf(object.subscription));
      return;

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
    case "invoice.voided": {
      const subscriptionId = subscriptionIdOf(object.parent?.subscription_details?.subscription);
      if (subscriptionId) await syncSubscription(subscriptionId);
      return;
    }

    // Card changed in the Portal: refresh the "Visa •••• 4242" shown in
    // the dashboard.
    case "customer.updated":
    case "payment_method.attached": {
      const customerId = event.type === "customer.updated" ? object.id : object.customer;
      if (!customerId) return;
      const { data, error } = await supabaseAdmin
        .from("tenant_billing")
        .select("stripe_subscription_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (error) throw error;
      if (data?.stripe_subscription_id) await syncSubscription(data.stripe_subscription_id);
      return;
    }

    // Plans aren't changed automatically on a dispute — flagged for us to
    // decide (owner notifications come later).
    case "charge.dispute.created": {
      const tenantId = await tenantIdFor({ customer: object.customer ?? null }).catch(() => null);
      console.error(
        `[billing] DISPUTE ${object.id} for ${object.amount} ${object.currency} — studio ${tenantId ?? "unknown"}, reason ${object.reason}`
      );
      return;
    }

    default:
      return;
  }
}

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[billing] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    const body = await request.text();
    event = getStripe().webhooks.constructEvent(body, request.headers.get("stripe-signature"), secret);
  } catch (error) {
    console.warn("[billing] webhook signature check failed", error.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const { data: seen, error: seenError } = await supabaseAdmin
      .from("stripe_event")
      .select("processed_at")
      .eq("id", event.id)
      .maybeSingle();
    if (seenError) throw seenError;
    if (seen?.processed_at) return NextResponse.json({ received: true, duplicate: true });

    if (!seen) {
      const { error } = await supabaseAdmin
        .from("stripe_event")
        .upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }

    await handle(event);

    const { error: doneError } = await supabaseAdmin
      .from("stripe_event")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);
    if (doneError) throw doneError;

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[billing] webhook ${event.type} ${event.id} failed`, error);
    await supabaseAdmin
      .from("stripe_event")
      .update({ error: String(error?.message ?? error).slice(0, 1000) })
      .eq("id", event.id);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
