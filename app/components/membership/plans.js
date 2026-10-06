import { pricingTiers } from "@/app/components/landing/sectionsData";
import { planPrice } from "@/lib/billing/catalog.mjs";

// The self-serve plans, lowest first, built from the same pricing data as
// the public site so names, prices and features never drift apart.
// `value` matches tenant.plan; `rank` matches plan_rank() (migration 014).
// `monthlyPrice` / `yearlyPrice` are null for Starter.
// `studentLimit` / `limitBasis` back the "you're over this plan's limit"
// warning when downgrading.
const LIMITS = {
  starter: { studentLimit: 25, limitBasis: "total" },
  studio: { studentLimit: 100, limitBasis: "active" },
  "pro studio": { studentLimit: 500, limitBasis: "active" },
};

export const PLANS = pricingTiers
  .filter((tier) => tier.name !== "Serious Business")
  .map((tier, index) => {
    const value = tier.name.toLowerCase();
    return {
      value,
      rank: index + 1,
      name: tier.name,
      priceLabel: tier.price ?? `$${tier.monthlyPrice}`,
      cadence: tier.price ? tier.cadence : "/month",
      monthlyPrice: planPrice(value, "month"),
      yearlyPrice: planPrice(value, "year"),
      cap: tier.cap,
      features: tier.features,
      ...LIMITS[value],
    };
  });

export const getPlan = (value) => PLANS.find((plan) => plan.value === value) ?? PLANS[0];

// Feature names a lower plan drops, compared with the current one.
// Tiers list "Everything in X" plus their additions, so walk the ranks in
// between and collect each tier's own additions.
export const featuresLost = (fromValue, toValue) => {
  const from = getPlan(fromValue);
  const to = getPlan(toValue);
  return PLANS.filter((plan) => plan.rank > to.rank && plan.rank <= from.rank)
    .flatMap((plan) => plan.features)
    .filter((feature) => !feature.startsWith("Everything in"));
};

// "$75/month", "$765/year" — the price of a paid plan for one interval.
export const pricePerInterval = (plan, interval) => {
  const amount = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
  return amount == null ? plan.priceLabel : `$${amount.toLocaleString("en-US")}/${interval}`;
};

// Stripe amounts are in cents.
export const formatCents = (cents, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    Math.abs(cents) / 100
  );

// Stripe timestamps are in seconds; billing rows hold ISO strings.
export const toDate = (value) =>
  value == null ? null : typeof value === "number" ? new Date(value * 1000) : new Date(value);
