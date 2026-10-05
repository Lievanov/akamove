"use client";
import { Controller } from "react-hook-form";
import { emailRegex } from "../utils/utils";
import { Input } from "./Input";
import { useFieldIds, fieldAria, FieldLabel, FieldError } from "./Field";

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
  const { id, errorId } = useFieldIds();

  return (
    <div className="w-full">
      <FieldLabel htmlFor={id} hasError={hasError} required={!!required}>
        {label}
      </FieldLabel>
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
            {...fieldAria({ id, errorId, hasError, required: !!required })}
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
      <FieldError id={errorId} error={errors[property]} />
    </div>
  );
}

export default TextInput;
