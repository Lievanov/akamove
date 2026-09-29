"use client";
import { Controller } from "react-hook-form";
import { emailRegex } from "../utils/utils";
import { Input } from "./Input";
import { cn } from "./utils/cn";

function TextInput({
  property,
  label,
  errors,
  control,
  required,
  placeholder,
  rows,
  disabled,
  type,
  step,
  min,
  format,
  parse,
  prefix,
  suffix,
  rules,
}) {
  const hasError = !!errors[property];

  return (
    <div className="w-full">
      <label
        htmlFor={property}
        className={cn(
          "mb-1 block text-sm font-medium",
          hasError ? "text-red-600" : "text-brand-dark"
        )}
      >
        {label}
      </label>
      <Controller
        name={property}
        control={control}
        rules={{
          ...(required && { required }),
          ...(property === "email" && {
            pattern: {
              value: emailRegex,
              message: "Please enter a valid email address",
            },
          }),
          ...rules,
        }}
        render={({ field }) => (
          <Input
            id={property}
            placeholder={disabled ? "" : placeholder}
            disabled={disabled}
            type={type}
            step={step}
            min={min}
            rows={rows}
            error={hasError}
            prefix={prefix}
            suffix={suffix}
            {...field}
            value={format ? format(field.value) : field.value ?? ""}
            onChange={(e) =>
              field.onChange(parse ? parse(e.target.value) : e.target.value)
            }
          />
        )}
      />
      {hasError && (
        <p className="mt-1 text-sm text-red-600">
          {errors[property].message}
        </p>
      )}
    </div>
  );
}

export default TextInput;
