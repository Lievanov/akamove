"use client";
import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "./utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-brand-pink-deep text-white hover:bg-brand-pink-deeper",
        secondary: "bg-brand-dark text-brand-cream hover:bg-brand-dark/90",
        outline:
          "border border-brand-dark/20 text-brand-dark hover:bg-brand-dark/5",
        ghost: "text-brand-dark hover:bg-brand-dark/5",
      },
      size: {
        sm: "h-8 px-3 text-sm touch:h-10",
        md: "h-10 px-4 text-sm touch:h-11",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = forwardRef(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
