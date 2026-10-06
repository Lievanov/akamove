import { getStripe } from "@/lib/stripe";
import { isPaidPlan, priceLookupKey, parsePriceLookupKey } from "./catalog.mjs";

// Server-only. Stripe price ids differ between test and live mode, so the
// billing routes find prices by lookup key (created by
// scripts/stripe-setup.mjs) instead of hard-coding ids. Ids are cached
// for the life of the server process; re-running the setup script moves
// a lookup key to a new price, so restart the server after changing one.
const priceIds = new Map();

export async function getPriceId(plan, interval) {
  if (!isPaidPlan(plan) || !["month", "year"].includes(interval)) {
    throw new Error(`No price for plan "${plan}" / interval "${interval}"`);
  }
  const lookupKey = priceLookupKey(plan, interval);
  if (!priceIds.has(lookupKey)) {
    const { data } = await getStripe().prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    if (!data[0]) {
      throw new Error(`Stripe price "${lookupKey}" not found — run npm run stripe:setup`);
    }
    priceIds.set(lookupKey, data[0].id);
  }
  return priceIds.get(lookupKey);
}

// { plan, interval } for one of our prices, null for anything else.
export const planFromPrice = (price) => parsePriceLookupKey(price?.lookup_key);
