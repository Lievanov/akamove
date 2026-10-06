import { NextResponse } from "next/server";
import { requireTenantAdmin } from "./auth";

// Errors a billing route raises on purpose, with copy the UI shows as-is.
export class BillingError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Turns anything thrown inside a billing route into a response with
// user-facing copy. Stripe's card error messages ("Your card has
// insufficient funds.") are written for customers, so those pass through.
export function billingErrorResponse(error, label) {
  if (error instanceof BillingError) {
    return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
  }

  console.error(`[billing] ${label} failed`, error);

  if (error?.type === "StripeCardError") {
    return NextResponse.json({ error: error.message }, { status: 402 });
  }
  if (error?.code === "customer_tax_location_invalid") {
    return NextResponse.json(
      {
        error: "We couldn't work out tax for your billing address. Update it and try again.",
        action: "update_address",
      },
      { status: 409 }
    );
  }
  if (error?.code === "resource_missing") {
    return NextResponse.json(
      { error: "Your billing changed in the meantime. Refresh the page and try again." },
      { status: 409 }
    );
  }
  if (["StripeConnectionError", "StripeAPIError", "StripeRateLimitError"].includes(error?.type)) {
    return NextResponse.json(
      { error: "Billing is temporarily unavailable. Nothing was charged — try again in a minute." },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { error: "Something went wrong with billing. Nothing was charged — try again." },
    { status: 500 }
  );
}

// Wraps a billing route: reads the JSON body, checks the caller is an
// admin of body.tenantId, and maps errors. The handler gets
// { body, user, tenant, billing } and returns a plain object (sent as
// 200 JSON) or a NextResponse.
export function billingRoute(label, handler) {
  return async function POST(request) {
    try {
      const body = await request.json().catch(() => ({}));
      const ctx = await requireTenantAdmin(request, body.tenantId);
      if (ctx.error) return ctx.error;
      const result = await handler({ body, ...ctx });
      return result instanceof NextResponse ? result : NextResponse.json(result);
    } catch (error) {
      return billingErrorResponse(error, label);
    }
  };
}

export const appUrl = (path) => `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
