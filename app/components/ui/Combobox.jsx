"use client";
import { useState } from "react";
import { Controller } from "react-hook-form";
import * as RadixPopover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "./utils/cn";

function ComboboxCore({
  value,
  onChange,
  options = [],
  getOptionLabel = (o) => o?.label ?? String(o ?? ""),
  getOptionValue = (o) => o?.id ?? o,
  multiple = false,
  placeholder = "Select...",
  emptyText = "No results found",
  disabled,
  error,
  onSearchChange,
  searchPlaceholder = "Search...",
}) {
  const [open, setOpen] = useState(false);

  const selectedOptions = multiple
    ? options.filter((o) =>
        (value || []).some((v) => getOptionValue(v) === getOptionValue(o))
      )
    : options.find((o) => getOptionValue(o) === getOptionValue(value)) ?? null;

  const isSelected = (option) =>
    multiple
      ? selectedOptions.some((o) => getOptionValue(o) === getOptionValue(option))
      : selectedOptions && getOptionValue(selectedOptions) === getOptionValue(option);

  const handleSelect = (option) => {
    if (multiple) {
      const already = isSelected(option);
      const next = already
        ? selectedOptions.filter(
            (o) => getOptionValue(o) !== getOptionValue(option)
          )
        : [...selectedOptions, option];
      onChange(next);
    } else {
      onChange(option);
      setOpen(false);
    }
  };

  const removeChip = (option, e) => {
    e.stopPropagation();
    onChange(selectedOptions.filter((o) => getOptionValue(o) !== getOptionValue(option)));
  };

  return (
    <div className="w-full">
      <RadixPopover.Root open={open} onOpenChange={setOpen}>
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm text-brand-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink disabled:cursor-not-allowed disabled:bg-brand-dark/5",
              error ? "border-red-500" : "border-brand-dark/20"
            )}
          >
            {multiple ? (
              selectedOptions.length ? (
                <span className="flex flex-wrap gap-1">
                  {selectedOptions.map((option) => (
                    <span
                      key={getOptionValue(option)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-pink/10 px-2 py-0.5 text-xs text-brand-dark"
                    >
                      {getOptionLabel(option)}
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => removeChip(option, e)}
                        className="rounded-full hover:bg-brand-pink/20"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-brand-dark/40">{placeholder}</span>
              )
            ) : (
              <span className={selectedOptions ? "" : "text-brand-dark/40"}>
                {selectedOptions ? getOptionLabel(selectedOptions) : placeholder}
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </RadixPopover.Trigger>
        <RadixPopover.Portal>
          <RadixPopover.Content
            align="start"
            className="z-50 w-[--radix-popover-trigger-width] overflow-hidden rounded-md border border-brand-dark/10 bg-white shadow-lg"
          >
            <Command className="w-full" shouldFilter={!onSearchChange}>
              <Command.Input
                placeholder={searchPlaceholder}
                onValueChange={onSearchChange}
                className="w-full border-b border-brand-dark/10 px-3 py-2 text-sm text-brand-dark outline-none placeholder:text-brand-dark/40"
              />
              <Command.List className="max-h-64 overflow-y-auto p-1">
                <Command.Empty className="px-3 py-2 text-sm text-brand-dark/50">
                  {emptyText}
                </Command.Empty>
                {options.map((option) => (
                  <Command.Item
                    key={getOptionValue(option)}
                    value={getOptionLabel(option)}
                    onSelect={() => handleSelect(option)}
                    className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm text-brand-dark data-[selected=true]:bg-brand-pink/10"
                  >
                    {getOptionLabel(option)}
                    {isSelected(option) && (
                      <Check className="h-4 w-4 text-brand-pink" />
                    )}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </div>
  );
}

function Combobox({ property, label, errors, control, required, ...rest }) {
  const hasError = !!errors?.[property];

  const field = label && (
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
        {field}
        <ComboboxCore {...rest} error={hasError} />
        {hasError && (
          <p className="mt-1 text-sm text-red-600">{errors[property].message}</p>
        )}
      </div>
    );
  }

  const getOptionValue = rest.getOptionValue ?? ((o) => o?.id ?? o);
  const options = rest.options ?? [];

  return (
    <div className="w-full">
      {field}
      <Controller
        name={property}
        control={control}
        rules={{ ...(required && { required }), ...rest.rules }}
        render={({ field: rhfField }) => (
          <ComboboxCore
            {...rest}
            value={
              rest.multiple
                ? options.filter((o) =>
                    (rhfField.value || []).includes(getOptionValue(o))
                  )
                : options.find((o) => getOptionValue(o) === rhfField.value) ??
                  null
            }
            onChange={(option) => {
              rhfField.onChange(
                rest.multiple
                  ? option.map(getOptionValue)
                  : getOptionValue(option)
              );
              rest.onSelectOption?.(option);
            }}
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

export { Combobox };
