import { pricingTiers } from "@/app/components/landing/sectionsData";

// The self-serve plans, lowest first, built from the same pricing data as
// the public site so names, prices and features never drift apart.
// `value` matches tenant.plan; `rank` matches plan_rank() (migration 014).
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
