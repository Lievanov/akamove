#!/usr/bin/env node
//
// Creates (or brings up to date) everything the app needs in a Stripe
// account: one product per paid plan, a monthly and a yearly price for
// each (found by lookup key, see lib/billing/catalog.mjs), and the
// Customer Portal configuration. Safe to re-run: anything already
// correct is left alone, a price whose amount changed is replaced
// (existing subscribers keep the old one), and nothing is deleted.
//
// Usage:
//   npm run stripe:setup            # sandbox / test key
//   npm run stripe:setup -- --live  # required to touch a live key
//
// Use a Stripe sandbox for development, and a restricted key (rk_...)
// with write access to Products, Prices, Customer portal and read access
// to Tax settings / registrations.
//
// Needs STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL (read from .env and
// .env.local). Prints STRIPE_PORTAL_CONFIGURATION_ID for .env.local, and
// the Dashboard-only settings it can't make for you.

import Stripe from "stripe";
import {
  BILLING_INTERVALS,
  PAID_PLANS,
  planPrice,
  priceLookupKey,
} from "../lib/billing/catalog.mjs";

const PLAN_NAMES = { studio: "Studio", "pro studio": "Pro Studio" };
// Stripe Tax code: Software as a service (SaaS) — business use.
const TAX_CODE = "txcd_10103001";
const CURRENCY = "usd";
const PORTAL_MARKER = "akamove_billing";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

if (!key) exit("STRIPE_SECRET_KEY is not set (put it in .env.local).");
if (!appUrl) exit("NEXT_PUBLIC_APP_URL is not set (e.g. http://localhost:3000).");
const isLive = /^(sk|rk)_live_/.test(key);
if (isLive && !process.argv.includes("--live")) {
  exit("That's a live key. Re-run with --live if you really mean to change live mode.");
}

const stripe = new Stripe(key, { maxNetworkRetries: 2 });
const mode = isLive ? "LIVE" : "test";
console.log(`Stripe setup (${mode} mode)\n`);

// Products --------------------------------------------------------------

const products = await stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: 1000 });

const productIds = {};
for (const plan of PAID_PLANS) {
  const name = `aka Move ${PLAN_NAMES[plan]}`;
  let product = products.find((p) => p.metadata?.akamove_plan === plan);
  if (!product) {
    product = await stripe.products.create({
      name,
      tax_code: TAX_CODE,
      metadata: { akamove_plan: plan },
    });
    log("created", `product ${name}`, product.id);
  } else if (product.name !== name || !product.active || product.tax_code !== TAX_CODE) {
    product = await stripe.products.update(product.id, { name, active: true, tax_code: TAX_CODE });
    log("updated", `product ${name}`, product.id);
  } else {
    log("ok", `product ${name}`, product.id);
  }
  productIds[plan] = product.id;
}

// Prices ----------------------------------------------------------------
// A price's amount can't change, so a new amount means a new price that
// takes over the lookup key; the old one is archived.

for (const plan of PAID_PLANS) {
  for (const interval of BILLING_INTERVALS) {
    const lookupKey = priceLookupKey(plan, interval);
    const amount = planPrice(plan, interval) * 100;
    const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const existing = data[0];

    const matches =
      existing &&
      existing.active &&
      existing.unit_amount === amount &&
      existing.currency === CURRENCY &&
      existing.recurring?.interval === interval &&
      existing.tax_behavior === "exclusive" &&
      existing.product === productIds[plan];

    if (matches) {
      log("ok", `price ${lookupKey} $${amount / 100}/${interval}`, existing.id);
      continue;
    }

    const price = await stripe.prices.create({
      product: productIds[plan],
      currency: CURRENCY,
      unit_amount: amount,
      recurring: { interval },
      tax_behavior: "exclusive",
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: { akamove_plan: plan },
    });
    log("created", `price ${lookupKey} $${amount / 100}/${interval}`, price.id);

    if (existing?.active) {
      await stripe.prices.update(existing.id, { active: false });
      log("archived", `old price ${lookupKey}`, existing.id);
    }
  }
}

// Customer Portal ---------------------------------------------------------
// Card, billing details and invoices only. Plan changes and cancelling
// happen in the app (Settings → Membership), which shows what changes
// and runs the cancel survey.

const portalSettings = {
  business_profile: { headline: "aka Move — manage your billing" },
  default_return_url: `${appUrl}/dashboard/settings/membership`,
  features: {
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] },
    subscription_cancel: { enabled: false },
    subscription_update: { enabled: false },
  },
  metadata: { [PORTAL_MARKER]: "true" },
};

const portals = await stripe.billingPortal.configurations
  .list({ active: true, limit: 100 })
  .autoPagingToArray({ limit: 1000 });
let portal = portals.find((c) => c.metadata?.[PORTAL_MARKER] === "true");
if (portal) {
  portal = await stripe.billingPortal.configurations.update(portal.id, portalSettings);
  log("updated", "portal configuration", portal.id);
} else {
  portal = await stripe.billingPortal.configurations.create(portalSettings);
  log("created", "portal configuration", portal.id);
}

// Stripe Tax ----------------------------------------------------------------

// automatic_tax with no active registration quietly collects $0 tax, so
// check both that Tax is set up and that it's registered somewhere.

let taxStatus = "unknown";
let registrations = [];
try {
  taxStatus = (await stripe.tax.settings.retrieve()).status;
  registrations = (await stripe.tax.registrations.list({ status: "active", limit: 100 })).data;
} catch (error) {
  taxStatus = `unavailable (${error.message})`;
}
const taxReady = taxStatus === "active" && registrations.length > 0;
log(taxStatus === "active" ? "ok" : "TODO", `Stripe Tax settings: ${taxStatus}`);
log(
  registrations.length ? "ok" : "TODO",
  `active tax registrations: ${registrations.map((r) => [r.country, r.country_options?.us?.state].filter(Boolean).join("-")).join(", ") || "none"}`
);

// Summary -------------------------------------------------------------------

console.log(`
Add to .env.local:
  STRIPE_PORTAL_CONFIGURATION_ID=${portal.id}

Finish in the Stripe Dashboard (${mode} mode) — these have no API:
  1. Tax → Settings: head office address, default tax behavior "exclusive",
     then Tax → Registrations for every place you must collect.${taxReady ? "" : "\n     (Not ready yet: until there's an active registration, checkouts\n     go through but collect no tax.)"}
  2. Billing → Revenue recovery → Retries: Smart Retries (Stripe's
     recommended 8 tries within 2 weeks), and "If all retries for a
     payment fail" → cancel the subscription.
  3. Billing → Revenue recovery → Emails: failed payment, expiring card,
     and "Send a Stripe-hosted link for customers to confirm their
     payments when required" (3D Secure on renewals).
  4. Settings → Customer emails: successful payments and refunds.
  5. Webhook endpoint → added in Phase 3 (app/api/billing/webhook).
`);

function log(status, what, id = "") {
  console.log(`  ${status.padEnd(8)} ${what}${id ? `  (${id})` : ""}`);
}

function exit(message) {
  console.error(message);
  process.exit(1);
}
