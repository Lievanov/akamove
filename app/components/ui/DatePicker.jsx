"use client";
import { useState } from "react";
import { Controller } from "react-hook-form";
import * as RadixPopover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { cn } from "./utils/cn";

const dayPickerClassNames = {
  root: "p-3",
  months: "flex flex-col",
  month: "space-y-3",
  month_caption: "flex justify-center px-8 pt-1",
  caption_label: "text-sm font-semibold text-brand-dark",
  nav: "flex items-center justify-between absolute inset-x-2 top-1",
  button_previous:
    "h-7 w-7 inline-flex items-center justify-center rounded-md text-brand-dark hover:bg-brand-dark/10",
  button_next:
    "h-7 w-7 inline-flex items-center justify-center rounded-md text-brand-dark hover:bg-brand-dark/10",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "w-9 text-xs font-medium text-brand-dark/50",
  week: "flex mt-1",
  day: "h-9 w-9 text-center text-sm p-0",
  day_button:
    "h-9 w-9 rounded-md text-brand-dark hover:bg-brand-pink/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink",
  today: "font-semibold text-brand-pink",
  selected: "[&>button]:bg-brand-pink [&>button]:text-white [&>button]:hover:bg-brand-pink",
  outside: "text-brand-dark/30",
  disabled: "text-brand-dark/20 pointer-events-none",
  dropdowns: "flex items-center gap-1",
  dropdown_root: "relative",
  dropdown: "text-sm rounded border border-brand-dark/20 px-1 py-0.5",
};

function DatePickerCore({ value, onChange, disabled, error, placeholder = "Select a date" }) {
  const [open, setOpen] = useState(false);

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm text-brand-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink disabled:cursor-not-allowed disabled:bg-brand-dark/5",
            error ? "border-red-500" : "border-brand-dark/20"
          )}
        >
          <span className={value ? "" : "text-brand-dark/40"}>
            {value ? value.toLocaleDateString() : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 opacity-60" />
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          className="z-50 rounded-md border border-brand-dark/10 bg-white shadow-lg"
        >
          <DayPicker
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => {
              onChange(date ?? null);
              setOpen(false);
            }}
            classNames={dayPickerClassNames}
            captionLayout="dropdown"
            startMonth={new Date(1920, 0)}
            endMonth={new Date()}
            defaultMonth={value ?? undefined}
          />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

function DatePicker({
  property,
  label,
  errors,
  control,
  required,
  disabled,
  placeholder = "Select a date",
  value,
  onChange,
}) {
  const hasError = !!errors?.[property];

  const labelEl = label && (
    <label
      className={cn(
        "mb-1 block text-sm font-medium",
        hasError ? "text-red-600" : "text-brand-dark"
      )}
    >
      {label}
    </label>
  );

  if (!control) {
    return (
      <div className="w-full">
        {labelEl}
        <DatePickerCore
          value={value}
          onChange={onChange}
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
          <DatePickerCore
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
            placeholder={placeholder}
            error={hasError}
          />
        )}
      />
      {hasError && (
        <p className="mt-1 text-sm text-red-600">{errors[property].message}</p>
      )}
    </div>
  );
}

export { DatePicker };
