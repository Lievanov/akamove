"use client";
import { YEARLY_DISCOUNT } from "@/lib/billing/catalog.mjs";
import { cn } from "@/app/components/ui/utils/cn";

const OPTIONS = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

// Monthly / Yearly switch for paid plan prices — same look as the public
// pricing section.
function IntervalToggle({ value, onChange, className }) {
  return (
    <div
      role="group"
      aria-label="Billing period"
      className={cn("inline-flex items-center gap-1 rounded-full bg-brand-dark/8 p-1", className)}
    >
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink",
              active ? "bg-brand-dark text-white" : "text-brand-dark/60 hover:text-brand-dark"
            )}
          >
            {option.label}
            {option.value === "year" && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  active ? "bg-brand-pink text-white" : "bg-brand-pink/15 text-brand-pink-deep"
                )}
              >
                Save {Math.round(YEARLY_DISCOUNT * 100)}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default IntervalToggle;
