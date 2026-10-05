"use client";
import { cn } from "./utils/cn";

// `tone` picks a token-backed style. Status tones (success / warning /
// danger) are for state only — see the status colors in tailwind.config.
const TONES = {
  neutral: "bg-brand-dark/10 text-brand-dark",
  strong: "bg-brand-dark/70 text-white",
  accent: "bg-brand-pink-deep text-white",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function Chip({ label, tone = "strong", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    >
      {label}
    </span>
  );
}

export { Chip };
