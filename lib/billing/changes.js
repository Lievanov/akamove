import { getStripe } from "@/lib/stripe";
import { getPriceId, planFromPrice } from "./prices";
import { pendingSchedulePhase, syncSubscription } from "./sync";
import { BILLING_INTERVALS, hasLiveSubscription, isPaidPlan, planChangeKind, planPrice } from "./catalog.mjs";
import { BillingError } from "./route";

// Server-only. Plan changes for a studio that already has a subscription.
// Each action re-syncs at the end so the dashboard updates without
// waiting for the webhook (which syncs again — harmless).
//
// One rule keeps the money predictable: a studio with a pending cancel
// or pending downgrade undoes it (resume) before upgrading or scheduling
// another change, so a failed payment can never leave it in a state it
// didn't choose.

const OWES_MONEY = ["past_due", "incomplete", "unpaid"];

async function loadSubscription(billing) {
  if (!hasLiveSubscription(billing)) {
    throw new BillingError(409, "Your studio doesn't have an active subscription.");
  }
  const subscription = await getStripe().subscriptions.retrieve(billing.stripe_subscription_id, {
    expand: ["items.data.price", "schedule"],
  });
  const item = subscription.items.data[0];
  return { subscription, item, current: planFromPrice(item.price) };
}

const isCancelling = (subscription) => subscription.cancel_at_period_end || !!subscription.cancel_at;

const hasPendingChange = (subscription) =>
  isCancelling(subscription) || !!pendingSchedulePhase(subscription.schedule);

// A schedule that's attached but has nothing left to do (its downgrade
// already happened) still blocks direct changes — let go of it first.
async function releaseSchedule(subscription) {
  const schedule = subscription.schedule;
  if (schedule && ["active", "not_started"].includes(schedule.status)) {
    await getStripe().subscriptionSchedules.release(schedule.id);
  }
}

function parseTarget(body) {
  if (!isPaidPlan(body.plan) || !BILLING_INTERVALS.includes(body.interval)) {
    throw new BillingError(400, "Pick a plan and billing period.");
  }
  return { plan: body.plan, interval: body.interval };
}

function assertCanChange(subscription) {
  if (OWES_MONEY.includes(subscription.status)) {
    throw new BillingError(409, "Your last payment didn't go through. Pay it first, then change plans.", {
      action: "pay_invoice",
    });
  }
  if (hasPendingChange(subscription)) {
    throw new BillingError(409, "Undo your scheduled change first, then pick a new plan.", {
      action: "resume",
    });
  }
}

// What a change would do, for the confirm dialog. Upgrades ask Stripe for
// the exact prorated amount (tax included); pass the returned
// prorationDate to changePlan so the charge matches what was shown.
export async function previewChange(billing, body) {
  const target = parseTarget(body);
  const { subscription, item, current } = await loadSubscription(billing);
  const kind = planChangeKind(current, target);

  if (kind === "none") return { kind };
  if (kind === "downgrade" || subscription.status === "trialing") {
    return {
      kind,
      trialing: subscription.status === "trialing",
      amountDue: 0,
      effectiveAt: kind === "downgrade" ? item.current_period_end : null,
      newPrice: planPrice(target.plan, target.interval) * 100,
      currency: item.price.currency,
    };
  }

  const prorationDate = Math.floor(Date.now() / 1000);
  const preview = await getStripe().invoices.createPreview({
    customer: subscription.customer,
    subscription: subscription.id,
    automatic_tax: { enabled: true },
    subscription_details: {
      items: [{ id: item.id, price: await getPriceId(target.plan, target.interval) }],
      proration_behavior: "always_invoice",
      proration_date: prorationDate,
    },
  });

  return {
    kind,
    trialing: false,
    amountDue: preview.amount_due,
    subtotal: preview.subtotal,
    tax: preview.total - (preview.total_excluding_tax ?? preview.total),
    // Negative when unused time is worth more than the new charge — it
    // goes to the account balance and pays future invoices.
    total: preview.total,
    currency: preview.currency,
    prorationDate,
  };
}

// Upgrades apply now (charged immediately, only applied once paid);
// downgrades are scheduled for the period end.
export async function changePlan(billing, body) {
  const target = parseTarget(body);
  const { subscription, item, current } = await loadSubscription(billing);
  const kind = planChangeKind(current, target);
  if (kind === "none") throw new BillingError(400, "You're already on that plan.");
  assertCanChange(subscription);

  const stripe = getStripe();
  const price = await getPriceId(target.plan, target.interval);
  await releaseSchedule(subscription);

  // Nothing is charged during a free trial, so any switch is just a
  // price swap; the studio keeps Pro Studio until the trial date.
  if (subscription.status === "trialing") {
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price }],
      proration_behavior: "none",
    });
    await syncSubscription(subscription.id);
    return { status: "applied", kind };
  }

  if (kind === "downgrade") {
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id });
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        {
          items: [{ price: item.price.id, quantity: 1 }],
          start_date: schedule.current_phase.start_date,
          end_date: schedule.current_phase.end_date,
        },
        {
          items: [{ price, quantity: 1 }],
          duration: { interval: target.interval, interval_count: 1 },
        },
      ],
    });
    await syncSubscription(subscription.id);
    return { status: "scheduled", kind, effectiveAt: schedule.current_phase.end_date };
  }

  // Upgrade. pending_if_incomplete: the new price only takes effect once
  // the proration invoice is paid; if the card is declined or the bank
  // wants 3D Secure, the subscription stays as it was and the open
  // invoice's hosted page can finish the payment.
  let updated;
  try {
    updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      ...(Number.isInteger(body.prorationDate) && { proration_date: body.prorationDate }),
      expand: ["latest_invoice"],
    });
  } catch (error) {
    if (error?.type !== "StripeCardError") throw error;
    updated = await stripe.subscriptions.retrieve(subscription.id, { expand: ["latest_invoice"] });
  }

  await syncSubscription(subscription.id);

  if (updated.pending_update) {
    return {
      status: "payment_required",
      kind,
      invoiceUrl: updated.latest_invoice?.hosted_invoice_url ?? null,
      error:
        "Your card didn't go through, so your plan hasn't changed. Finish the payment to upgrade.",
    };
  }
  return { status: "applied", kind };
}

// Cancel = Starter at the end of the paid period (or the trial). A studio
// that owes money is cancelled right away and its open invoice voided, so
// we never chase someone who has left.
export async function cancelSubscription(billing) {
  const { subscription } = await loadSubscription(billing);
  const stripe = getStripe();

  await releaseSchedule(subscription);

  if (OWES_MONEY.includes(subscription.status)) {
    const canceled = await stripe.subscriptions.cancel(subscription.id, {
      prorate: false,
      invoice_now: false,
      expand: ["latest_invoice"],
    });
    if (canceled.latest_invoice?.status === "open") {
      await stripe.invoices.voidInvoice(canceled.latest_invoice.id);
    }
    await syncSubscription(subscription.id);
    return { immediate: true, endsAt: Math.floor(Date.now() / 1000) };
  }

  const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
  await syncSubscription(subscription.id);
  return { immediate: false, endsAt: updated.items.data[0].current_period_end };
}

// Undo a pending cancel and/or a scheduled downgrade.
export async function resumeSubscription(billing) {
  const { subscription } = await loadSubscription(billing);
  if (!hasPendingChange(subscription)) {
    throw new BillingError(409, "There's no scheduled change to undo.");
  }
  await releaseSchedule(subscription);
  // Stripe fills in cancel_at for a cancel_at_period_end cancel too, and
  // rejects both in one request — clear whichever was set.
  if (subscription.cancel_at_period_end) {
    await getStripe().subscriptions.update(subscription.id, { cancel_at_period_end: false });
  } else if (subscription.cancel_at) {
    await getStripe().subscriptions.update(subscription.id, { cancel_at: "" });
  }
  await syncSubscription(subscription.id);
  return { resumed: true };
}
