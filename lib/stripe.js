import Stripe from "stripe";

// Server-only Stripe client. Never import this from client components —
// it holds the secret key. Created on first use rather than at import,
// because the constructor throws without a key and Next imports route
// modules during `next build`. The API version is the one this SDK
// release pins; bump it by upgrading the `stripe` package.
let client;

export function getStripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
      appInfo: { name: "aka Move" },
    });
  }
  return client;
}
