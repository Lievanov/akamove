"use client";
import { forwardRef } from "react";
import { cn } from "./utils/cn";

const Input = forwardRef(
  ({ className, error, rows, type, prefix, suffix, ...props }, ref) => {
    const Component = rows ? "textarea" : "input";
    const field = (
      <Component
        ref={ref}
        type={type}
        rows={rows}
        className={cn(
          "block w-full rounded-md border bg-white px-3 py-2 text-sm text-brand-dark shadow-sm transition-colors placeholder:text-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-pink disabled:cursor-not-allowed disabled:bg-brand-dark/5",
          error ? "border-red-500" : "border-brand-dark/20",
          prefix && "pl-7",
          suffix && "pr-7",
          className
        )}
        {...props}
      />
    );

    if (!prefix && !suffix) return field;

    return (
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-dark/50">
            {prefix}
          </span>
        )}
        {field}
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-dark/50">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
