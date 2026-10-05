"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClassType, normalizeClassTypeName } from "@/api/class/class_type";
import TextInput from "@/app/components/ui/TextInput";
import { Button } from "@/app/components/ui/Button";

// existingNames: names of the studio's class types, to catch duplicates
// before they reach the database.
const ClassTypeForm = ({ onSubmit, existingNames = [] }) => {
  const [displayForm, setDisplayForm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  const cleanForm = (displayFormToggle) => {
    reset();
    setDisplayForm(displayFormToggle);
  };

  const preSubmit = async (data) => {
    const { ok, error } = await createClassType(data);
    if (!ok) {
      // Keep the form open so the name can be fixed.
      setError("name", { message: error });
      return;
    }
    cleanForm(false);
    await onSubmit(true);
  };

  if (!displayForm)
    return (
      <div className="pt-4">
        <Button variant="outline" className="w-full" onClick={() => cleanForm(true)}>
          Create New Class Type
        </Button>
      </div>
    );

  return (
    <div className="my-2 rounded-lg border border-brand-dark/10 bg-white p-4">
      <h4 className="mb-3 text-center text-lg font-semibold text-brand-dark">
        New Class Type
      </h4>
      <form onSubmit={handleSubmit(preSubmit)}>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput
              property="name"
              label="Class Type Name"
              errors={errors}
              control={control}
              required="Class type name is required"
              placeholder="Salsa"
              rules={{
                validate: (value) => {
                  const normalized = normalizeClassTypeName(value);
                  if (!normalized) return "Class type name is required";
                  const taken = existingNames.some(
                    (name) => normalizeClassTypeName(name) === normalized
                  );
                  return !taken || `A class type named “${value.trim()}” already exists.`;
                },
              }}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Create
          </Button>
          <Button variant="outline" onClick={() => cleanForm(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClassTypeForm;
