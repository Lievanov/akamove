#!/usr/bin/env node
//
// End-to-end billing scenarios against a Stripe SANDBOX, using the app's
// real lib/billing code (changes.js, sync.js, prices.js). The database is
// replaced by fake-supabase.mjs: every write that would go to
// apply_stripe_subscription is recorded and asserted on instead.
//
// Each scenario runs on its own Stripe test clock, so renewals and trial
// ends happen in seconds. Clocks (and their customers) are deleted at
// the end.
//
//   npm run billing:scenarios                 # all scenarios
//   npm run billing:scenarios -- upgrade      # names containing "upgrade"
//
// Not covered here (needs the Stripe CLI + a browser): Checkout pages,
// the Customer Portal, and webhook delivery. See the checklist in
// api/db/migrations/README.md → Phase 10.

import assert from "node:assert/strict";
import { getStripe } from "@/lib/stripe";
import { getPriceId } from "@/lib/billing/prices";
import { changePlan, previewChange, cancelSubscription, resumeSubscription } from "@/lib/billing/changes";
import { syncSubscription } from "@/lib/billing/sync";
import { rpcCalls } from "./fake-supabase.mjs";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!/^(sk|rk)_test_/.test(key)) {
  console.error("Scenarios only run with a sandbox / test key (sk_test_… or rk_test_…).");
  process.exit(1);
}

const stripe = getStripe();
const DAY = 24 * 60 * 60;
const filter = process.argv[2]?.toLowerCase();
const clocks = [];

// Helpers -----------------------------------------------------------------

async function newClock(name) {
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: `akamove ${name}`.slice(0, 300),
  });
  clocks.push(clock.id);
  return clock;
}

async function advance(clock, seconds) {
  const target = clock.frozen_time + seconds;
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: target });
  for (let i = 0; i < 120; i += 1) {
    const current = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (current.status === "ready") {
      clock.frozen_time = current.frozen_time;
      return;
    }
    if (current.status === "internal_failure") throw new Error("test clock failed to advance");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("test clock didn't finish advancing in 4 minutes");
}

async function attachCard(customerId, testPm) {
  const pm = await stripe.paymentMethods.attach(testPm, { customer: customerId });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
  return pm.id;
}

async function newCustomer(clock, tenantId, testPm = "pm_card_visa") {
  const customer = await stripe.customers.create({
    test_clock: clock.id,
    email: `${tenantId}@example.com`,
    name: `Scenario ${tenantId}`,
    address: { line1: "354 Oyster Point Blvd", city: "South San Francisco", state: "CA", postal_code: "94080", country: "US" },
    metadata: { tenant_id: tenantId },
  });
  await attachCard(customer.id, testPm);
  return customer;
}

// What Checkout would have created.
async function subscribe(customer, plan, interval, extra = {}) {
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: await getPriceId(plan, interval) }],
    automatic_tax: { enabled: true },
    metadata: { tenant_id: customer.metadata.tenant_id },
    payment_behavior: "error_if_incomplete",
    ...extra,
  });
  await syncSubscription(subscription.id);
  return subscription;
}

// The tenant_billing row the routes would load (only these two fields
// matter to changes.js).
async function billingFor(subscriptionId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return { stripe_subscription_id: subscription.id, status: subscription.status };
}

const lastSync = (subscriptionId) =>
  rpcCalls.filter((call) => call.args.p_subscription_id === subscriptionId).at(-1)?.args;

// Scenarios ---------------------------------------------------------------

const scenarios = {
  async "subscribe: Studio monthly syncs plan, period end and card"(clock) {
    const customer = await newCustomer(clock, "t-subscribe");
    const sub = await subscribe(customer, "studio", "month");
    const synced = lastSync(sub.id);
    assert.equal(synced.p_status, "active");
    assert.equal(synced.p_plan, "studio");
    assert.equal(synced.p_interval, "month");
    assert.ok(synced.p_current_period_end, "period end recorded");
    assert.equal(synced.p_latest_invoice_url, null);
  },

  async "upgrade: Studio → Pro Studio charges exactly the previewed amount"(clock) {
    const customer = await newCustomer(clock, "t-upgrade");
    const sub = await subscribe(customer, "studio", "month");
    await advance(clock, 10 * DAY);
    const billing = await billingFor(sub.id);
    const preview = await previewChange(billing, { plan: "pro studio", interval: "month" });
    assert.equal(preview.kind, "upgrade");
    assert.ok(preview.amountDue > 0, "something to pay");
    const result = await changePlan(billing, { plan: "pro studio", interval: "month", prorationDate: preview.prorationDate });
    assert.equal(result.status, "applied");
    const updated = await stripe.subscriptions.retrieve(sub.id, { expand: ["latest_invoice"] });
    assert.equal(updated.latest_invoice.status, "paid");
    assert.equal(updated.latest_invoice.amount_paid, preview.amountDue, "charged what the dialog showed");
    assert.equal(lastSync(sub.id).p_plan, "pro studio");
  },

  async "upgrade: monthly → yearly applies now and moves to yearly billing"(clock) {
    const customer = await newCustomer(clock, "t-yearly");
    const sub = await subscribe(customer, "studio", "month");
    const billing = await billingFor(sub.id);
    const result = await changePlan(billing, { plan: "studio", interval: "year" });
    assert.equal(result.status, "applied");
    assert.equal(lastSync(sub.id).p_interval, "year");
  },

  async "upgrade: declined card leaves the plan unchanged and returns a pay link"(clock) {
    const customer = await newCustomer(clock, "t-declined");
    const sub = await subscribe(customer, "studio", "month");
    await attachCard(customer.id, "pm_card_chargeCustomerFail");
    const result = await changePlan(await billingFor(sub.id), { plan: "pro studio", interval: "month" });
    assert.equal(result.status, "payment_required");
    assert.ok(result.invoiceUrl, "hosted invoice link returned");
    const synced = lastSync(sub.id);
    assert.equal(synced.p_plan, "studio", "still on Studio");
    assert.ok(synced.p_latest_invoice_url, "pay link stored for the banner");
  },

  async "upgrade: card needing 3D Secure leaves the plan unchanged and returns a pay link"(clock) {
    const customer = await newCustomer(clock, "t-3ds");
    const sub = await subscribe(customer, "studio", "month");
    await attachCard(customer.id, "pm_card_authenticationRequired");
    const result = await changePlan(await billingFor(sub.id), { plan: "pro studio", interval: "month" });
    assert.equal(result.status, "payment_required");
    assert.ok(result.invoiceUrl);
    assert.equal(lastSync(sub.id).p_plan, "studio");
  },

  async "downgrade: Pro → Studio is scheduled, applies at period end, then upgrading works again"(clock) {
    const customer = await newCustomer(clock, "t-downgrade");
    const sub = await subscribe(customer, "pro studio", "month");
    const result = await changePlan(await billingFor(sub.id), { plan: "studio", interval: "month" });
    assert.equal(result.status, "scheduled");
    let synced = lastSync(sub.id);
    assert.equal(synced.p_plan, "pro studio", "keeps Pro until the period ends");
    assert.equal(synced.p_scheduled_plan, "studio");
    await advance(clock, 32 * DAY);
    await syncSubscription(sub.id);
    synced = lastSync(sub.id);
    assert.equal(synced.p_plan, "studio");
    assert.equal(synced.p_status, "active");
    assert.equal(synced.p_scheduled_plan, null);
    assert.equal(synced.p_cancel_at_period_end, false, "a switched schedule doesn't cancel");
    // The finished schedule mustn't block the next change.
    const again = await changePlan(await billingFor(sub.id), { plan: "pro studio", interval: "month" });
    assert.equal(again.status, "applied");
    assert.equal(lastSync(sub.id).p_plan, "pro studio");
  },

  async "downgrade: undo restores the current plan; upgrade preview works while one is scheduled"(clock) {
    const customer = await newCustomer(clock, "t-undo");
    const sub = await subscribe(customer, "studio", "year");
    await changePlan(await billingFor(sub.id), { plan: "studio", interval: "month" });
    assert.equal(lastSync(sub.id).p_scheduled_interval, "month");
    const preview = await previewChange(await billingFor(sub.id), { plan: "pro studio", interval: "year" });
    assert.equal(preview.kind, "upgrade");
    await resumeSubscription(await billingFor(sub.id));
    const synced = lastSync(sub.id);
    assert.equal(synced.p_scheduled_plan, null);
    assert.equal(synced.p_interval, "year");
  },

  async "cancel: at period end, resume undoes it, cancelling again ends on Starter"(clock) {
    const customer = await newCustomer(clock, "t-cancel");
    const sub = await subscribe(customer, "studio", "month");
    const cancelled = await cancelSubscription(await billingFor(sub.id));
    assert.equal(cancelled.immediate, false);
    assert.equal(lastSync(sub.id).p_cancel_at_period_end, true);
    await resumeSubscription(await billingFor(sub.id));
    assert.equal(lastSync(sub.id).p_cancel_at_period_end, false);
    await cancelSubscription(await billingFor(sub.id));
    await advance(clock, 32 * DAY);
    await syncSubscription(sub.id);
    assert.equal(lastSync(sub.id).p_status, "canceled");
  },

  async "renewal fails: past_due keeps the plan with a pay link; cancelling voids the invoice"(clock) {
    const customer = await newCustomer(clock, "t-pastdue");
    const sub = await subscribe(customer, "studio", "month");
    await attachCard(customer.id, "pm_card_chargeCustomerFail");
    await advance(clock, 32 * DAY);
    await syncSubscription(sub.id);
    let synced = lastSync(sub.id);
    assert.equal(synced.p_status, "past_due");
    assert.equal(synced.p_plan, "studio", "plan kept during retries");
    assert.ok(synced.p_latest_invoice_url, "pay link for the banner");
    await assert.rejects(
      changePlan(await billingFor(sub.id), { plan: "pro studio", interval: "month" }),
      /payment didn't go through/
    );
    const cancelled = await cancelSubscription(await billingFor(sub.id));
    assert.equal(cancelled.immediate, true);
    const ended = await stripe.subscriptions.retrieve(sub.id, { expand: ["latest_invoice"] });
    assert.equal(ended.status, "canceled");
    assert.equal(ended.latest_invoice.status, "void", "we don't chase a studio that left");
    synced = lastSync(sub.id);
    assert.equal(synced.p_status, "canceled");
  },

  async "trial: no charge, plan swap is free, first charge on the trial date"(clock) {
    const customer = await newCustomer(clock, "t-trial");
    const sub = await subscribe(customer, "pro studio", "month", { trial_end: clock.frozen_time + 5 * DAY });
    assert.equal(lastSync(sub.id).p_status, "trialing");
    const preview = await previewChange(await billingFor(sub.id), { plan: "studio", interval: "month" });
    assert.equal(preview.trialing, true);
    const result = await changePlan(await billingFor(sub.id), { plan: "studio", interval: "month" });
    assert.equal(result.status, "applied");
    let invoices = await stripe.invoices.list({ subscription: sub.id });
    assert.ok(invoices.data.every((invoice) => invoice.amount_paid === 0), "nothing charged during the trial");
    await advance(clock, 6 * DAY);
    await syncSubscription(sub.id);
    const synced = lastSync(sub.id);
    assert.equal(synced.p_status, "active");
    assert.equal(synced.p_plan, "studio");
    invoices = await stripe.invoices.list({ subscription: sub.id });
    assert.ok(invoices.data.some((invoice) => invoice.amount_paid >= 7500), "first Studio charge after the trial");
  },
};

// Runner ------------------------------------------------------------------

const selected = Object.entries(scenarios).filter(([name]) => !filter || name.toLowerCase().includes(filter));
console.log(`Running ${selected.length} billing scenario(s) against the Stripe sandbox…\n`);

const results = await Promise.all(
  selected.map(async ([name, fn]) => {
    const started = Date.now();
    try {
      await fn(await newClock(name));
      return { name, ok: true, seconds: (Date.now() - started) / 1000 };
    } catch (error) {
      return { name, ok: false, seconds: (Date.now() - started) / 1000, error };
    }
  })
);

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}  (${result.seconds.toFixed(0)}s)`);
  if (!result.ok) console.log(`      ${result.error?.message ?? result.error}`.replace(/\n/g, "\n      "));
}

await Promise.all(clocks.map((id) => stripe.testHelpers.testClocks.del(id).catch(() => null)));
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed. Test clocks deleted.`);
process.exit(failed ? 1 : 0);
