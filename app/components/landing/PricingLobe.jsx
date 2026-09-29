"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { pricingTiers, YEARLY_DISCOUNT } from "./sectionsData";
import { LobeDivider } from "./LobeDivider";

function PricingLobe({ onStartFree, divider }) {
  const [billing, setBilling] = useState("monthly");
  const isYearly = billing === "yearly";

  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="relative overflow-hidden bg-brand-cream px-6 py-28 text-brand-dark sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-2xl font-display text-4xl leading-tight tracking-[-0.02em] sm:text-5xl">
          Priced by students, not by guesswork
        </h2>
        <p className="mt-5 max-w-xl text-lg text-brand-dark/70">
          Start free. Grow into what your studio actually needs. No
          long-term commitments — cancel anytime.
        </p>

        <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-brand-dark/8 p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            aria-pressed={!isYearly}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !isYearly
                ? "bg-brand-dark text-white"
                : "text-brand-dark/60 hover:text-brand-dark"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            aria-pressed={isYearly}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isYearly
                ? "bg-brand-dark text-white"
                : "text-brand-dark/60 hover:text-brand-dark"
            }`}
          >
            Yearly
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isYearly ? "bg-brand-pink text-white" : "bg-brand-pink/15 text-brand-pink"
              }`}
            >
              Save 15%
            </span>
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => {
            const isSolid = tier.tone === "solid";
            const hasMonthlyPrice = typeof tier.monthlyPrice === "number";

            let priceLabel = tier.price;
            let cadenceLabel = tier.cadence;
            let annualNote = null;

            if (hasMonthlyPrice) {
              if (isYearly) {
                const yearlyMonthlyEquivalent = Math.round(
                  tier.monthlyPrice * (1 - YEARLY_DISCOUNT)
                );
                const annualTotal = Math.round(
                  tier.monthlyPrice * 12 * (1 - YEARLY_DISCOUNT)
                );
                priceLabel = `$${yearlyMonthlyEquivalent}`;
                cadenceLabel = "/month";
                annualNote = `$${annualTotal} billed yearly`;
              } else {
                priceLabel = `$${tier.monthlyPrice}`;
                cadenceLabel = "/month";
              }
            }

            return (
              <div
                key={tier.name}
                className={`flex flex-col rounded-3xl border p-7 ${
                  isSolid
                    ? "border-brand-pink bg-brand-pink text-white shadow-[0_20px_45px_-20px_rgba(232,25,94,0.55)]"
                    : "border-brand-dark/12 bg-white/60"
                }`}
              >
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl">{priceLabel}</span>
                  {cadenceLabel && (
                    <span
                      className={`text-sm ${
                        isSolid ? "text-white/70" : "text-brand-dark/50"
                      }`}
                    >
                      {cadenceLabel}
                    </span>
                  )}
                </p>
                {annualNote && (
                  <p
                    className={`mt-0.5 text-xs ${
                      isSolid ? "text-white/70" : "text-brand-dark/50"
                    }`}
                  >
                    {annualNote}
                  </p>
                )}
                <p
                  className={`mt-1 text-sm ${
                    isSolid ? "text-white/80" : "text-brand-dark/60"
                  }`}
                >
                  {tier.cap}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isSolid ? "text-white" : "text-brand-pink"
                        }`}
                        strokeWidth={2.25}
                      />
                      <span className={isSolid ? "text-white/90" : "text-brand-dark/80"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-7"
                  variant={isSolid ? "secondary" : "outline"}
                  onClick={
                    tier.name === "Serious Business"
                      ? undefined
                      : () => onStartFree?.()
                  }
                >
                  {tier.name === "Serious Business" ? "Let's talk" : "Start free"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {divider && <LobeDivider {...divider} />}
    </section>
  );
}

export { PricingLobe };
