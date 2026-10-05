"use client";
import * as RadixSelect from "@radix-ui/react-select";
import { Controller } from "react-hook-form";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./utils/cn";
import { useFieldIds, fieldAria, FieldLabel, FieldError } from "./Field";

function SelectCore({
  value,
  onChange,
  options = [],
  disabled,
  error,
  placeholder = "Select...",
  ...triggerProps
}) {
  return (
    <RadixSelect.Root
      value={value != null ? String(value) : undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        {...triggerProps}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-base sm:text-sm touch:min-h-11 text-brand-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink disabled:cursor-not-allowed disabled:bg-brand-dark/5",
          error ? "border-danger" : "border-brand-dark/20"
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className="z-50 overflow-hidden rounded-md border border-brand-dark/10 bg-white shadow-lg">
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={String(option.value)}
                className="relative flex cursor-pointer select-none items-center rounded px-8 py-2 text-sm touch:py-3 text-brand-dark outline-none data-[highlighted]:bg-brand-pink/10"
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

function Select({
  property,
  label,
  errors,
  control,
  required,
  options = [],
  disabled,
  placeholder = "Select...",
  value,
  onChange,
  "aria-label": ariaLabel,
}) {
  const hasError = !!errors?.[property];
  const { id, errorId } = useFieldIds();
  const a11y = {
    ...fieldAria({ id, errorId, hasError, required: !!required }),
    "aria-label": label ? undefined : ariaLabel,
  };

  const labelEl = (
    <FieldLabel htmlFor={id} hasError={hasError} required={!!required}>
      {label}
    </FieldLabel>
  );

  if (!control) {
    return (
      <div className="w-full">
        {labelEl}
        <SelectCore
          {...a11y}
          value={value}
          onChange={onChange}
          options={options}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {labelEl}
      <Controller
        name={property}
        control={control}
        rules={{ ...(required && { required }) }}
        render={({ field }) => (
          <SelectCore
            {...a11y}
            value={field.value}
            onChange={field.onChange}
            options={options}
            disabled={disabled}
            placeholder={placeholder}
            error={hasError}
          />
        )}
      />
      <FieldError id={errorId} error={errors?.[property]} />
    </div>
  );
}

export { Select };
