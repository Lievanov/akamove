// The paid plans' prices and their Stripe lookup keys — the one place
// they're defined. Read by the marketing pricing data, the Membership
// tab, the billing routes, and scripts/stripe-setup.mjs (which creates
// the matching Stripe prices), so no import here may use the "@/" alias
// or pull in anything heavier than plain JS.
//
// Amounts are whole US dollars. Yearly is 12 months less YEARLY_DISCOUNT.

export const YEARLY_DISCOUNT = 0.15;

export const BILLING_INTERVALS = ["month", "year"];

const MONTHLY_PRICES = {
  studio: 75,
  "pro studio": 150,
};

export const PAID_PLANS = Object.keys(MONTHLY_PRICES);

export const isPaidPlan = (plan) => PAID_PLANS.includes(plan);

export const planPrice = (plan, interval = "month") => {
  const monthly = MONTHLY_PRICES[plan];
  if (monthly == null) return null;
  return interval === "year" ? Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT)) : monthly;
};

// "pro studio" + "year" → "pro_studio_yearly"
export const priceLookupKey = (plan, interval) =>
  `${plan.replace(/\s+/g, "_")}_${interval === "year" ? "yearly" : "monthly"}`;

// The reverse, for reading a plan back off a Stripe price. Null for any
// price that isn't one of ours.
export const parsePriceLookupKey = (lookupKey) => {
  for (const plan of PAID_PLANS) {
    for (const interval of BILLING_INTERVALS) {
      if (priceLookupKey(plan, interval) === lookupKey) return { plan, interval };
    }
  }
  return null;
};

// Subscription statuses that still hold (or are about to hold) a plan.
// Mirrors live_statuses in apply_stripe_subscription (migration 015).
export const LIVE_SUBSCRIPTION_STATUSES = ["incomplete", "trialing", "active", "past_due", "paused"];

export const hasLiveSubscription = (billing) =>
  !!billing?.stripe_subscription_id && LIVE_SUBSCRIPTION_STATUSES.includes(billing.status);

// How a switch between paid plans is applied:
//   "upgrade"   — a higher plan, or the same plan monthly → yearly: now,
//                 charging the prorated difference
//   "downgrade" — a lower plan, or the same plan yearly → monthly: at the
//                 end of the current billing period
//   "none"      — same plan and interval
// The plan decides before the interval, so yearly Studio → monthly Pro
// Studio is an upgrade (unused yearly time becomes account credit).
export const planChangeKind = (from, to) => {
  const fromRank = PAID_PLANS.indexOf(from.plan);
  const toRank = PAID_PLANS.indexOf(to.plan);
  if (toRank !== fromRank) return toRank > fromRank ? "upgrade" : "downgrade";
  if (to.interval === from.interval) return "none";
  return to.interval === "year" ? "upgrade" : "downgrade";
};
