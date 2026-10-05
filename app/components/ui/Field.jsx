"use client";
import { useId } from "react";
import { cn } from "./utils/cn";

// Shared wiring for labelled form controls (TextInput, Select, Combobox,
// DatePicker): one id ties the <label>, the control and its error
// message together so screen readers announce all three.

function useFieldIds() {
  const id = useId();
  return { id, errorId: `${id}-error` };
}

// Props to spread onto the focusable control (input or trigger button).
function fieldAria({ id, errorId, hasError, required }) {
  return {
    id,
    "aria-invalid": hasError || undefined,
    "aria-describedby": hasError ? errorId : undefined,
    "aria-required": required ? true : undefined,
  };
}

function FieldLabel({ htmlFor, hasError, required, children }) {
  if (!children) return null;
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1 block text-sm font-medium",
        hasError ? "text-danger" : "text-brand-dark"
      )}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-brand-pink-deep" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-sm text-danger">
      {error.message}
    </p>
  );
}

export { useFieldIds, fieldAria, FieldLabel, FieldError };
