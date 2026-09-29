"use client";
import { forwardRef } from "react";
import { cn } from "./utils/cn";

const IconButton = forwardRef(
  ({ className, type = "button", "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-dark transition-colors hover:bg-brand-dark/10 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink",
          className
        )}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";

export { IconButton };
