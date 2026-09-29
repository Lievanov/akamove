"use client";
import { cn } from "./utils/cn";

function Chip({ label, color, className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white",
        !color && "bg-brand-dark/70",
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    >
      {label}
    </span>
  );
}

export { Chip };
