"use client";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Controller } from "react-hook-form";
import { Check } from "lucide-react";
import { cn } from "./utils/cn";

function CheckboxCore({ checked, onCheckedChange, disabled, label, className }) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-sm text-brand-dark touch:min-h-11 touch:min-w-11 touch:justify-center",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <RadixCheckbox.Root
        checked={!!checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex h-4 w-4 items-center justify-center rounded border border-brand-dark/30 bg-white data-[state=checked]:border-brand-pink data-[state=checked]:bg-brand-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
      >
        <RadixCheckbox.Indicator>
          <Check className="h-3 w-3 text-white" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label}
    </label>
  );
}

function Checkbox({
  property,
  label,
  control,
  disabled,
  className,
  checked,
  onCheckedChange,
}) {
  if (!control) {
    return (
      <CheckboxCore
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        label={label}
        className={className}
      />
    );
  }

  return (
    <Controller
      name={property}
      control={control}
      render={({ field }) => (
        <CheckboxCore
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={disabled}
          label={label}
          className={className}
        />
      )}
    />
  );
}

export { Checkbox };
