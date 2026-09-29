"use client";
import * as RadixSwitch from "@radix-ui/react-switch";
import { Controller } from "react-hook-form";
import { cn } from "./utils/cn";

function Switch({ property, label, control, disabled, className }) {
  return (
    <Controller
      name={property}
      control={control}
      render={({ field }) => (
        <label
          className={cn(
            "inline-flex items-center gap-2 text-sm text-brand-dark",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <RadixSwitch.Root
            checked={!!field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
            className="relative h-5 w-9 rounded-full bg-brand-dark/20 transition-colors data-[state=checked]:bg-brand-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          >
            <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
          </RadixSwitch.Root>
          {label}
        </label>
      )}
    />
  );
}

export { Switch };
