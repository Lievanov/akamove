"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/app/components/ui/TextInput";
import { Button } from "@/app/components/ui/Button";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

// Another level in `classes` (the class type's current levels) with the
// same name and level number, ignoring case and outer spaces.
export const findDuplicateLevel = (classes = [], { name, level }, ignoreId) =>
  classes.find(
    (c) =>
      c.id !== ignoreId &&
      normalize(c.name) === normalize(name) &&
      normalize(c.level) === normalize(level)
  );

const ClassItemForm = ({ onSubmit, classes }) => {
  const [displayForm, setDisplayForm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const cleanForm = (displayFormToggle) => {
    reset();
    setDisplayForm(displayFormToggle);
  };

  useEffect(() => {
    cleanForm(false);
  }, [classes]);

  const preSubmit = async (data) => {
    cleanForm(false);
    await onSubmit({ ...data, name: data.name.trim(), level: data.level.trim() });
  };

  if (!displayForm)
    return (
      <div className="pt-4">
        <Button variant="outline" className="w-full" onClick={() => cleanForm(true)}>
          Add a Level
        </Button>
      </div>
    );

  return (
    <div className="my-2 rounded-lg border border-brand-dark/10 bg-white p-4">
      <h4 className="mb-3 text-center text-lg font-semibold text-brand-dark">
        New Level
      </h4>
      <form onSubmit={handleSubmit(preSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            property="name"
            label="Class Name"
            errors={errors}
            control={control}
            required="Class Name is required"
            placeholder="Beginner, Intermediate, etc..."
          />
          <TextInput
            property="level"
            label="Level"
            errors={errors}
            control={control}
            required="Level is required"
            placeholder="1"
            rules={{
              pattern: {
                value: /^[0-9]+$/,
                message: "Level must be an integer",
              },
              validate: (level, values) =>
                !findDuplicateLevel(classes, { name: values.name, level }) ||
                `“${values.name.trim()} ${level.trim()}” already exists in this class type.`,
            }}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add Level"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => cleanForm(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClassItemForm;
