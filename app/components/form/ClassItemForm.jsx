"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/app/components/ui/TextInput";
import { Button } from "@/app/components/ui/Button";

const ClassItemForm = ({ onSubmit, classes }) => {
  const [displayForm, setDisplayForm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
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
    await onSubmit(data);
  };

  if (!displayForm)
    return (
      <div className="pt-4">
        <Button variant="outline" className="w-full" onClick={() => cleanForm(true)}>
          Create New Item Class
        </Button>
      </div>
    );

  return (
    <div className="my-2 rounded-lg border border-brand-dark/10 p-4">
      <h4 className="mb-3 text-center text-lg font-semibold text-brand-dark">
        New Item Class
      </h4>
      <form onSubmit={handleSubmit(preSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            property="name"
            label="Class Name*"
            errors={errors}
            control={control}
            required="Class Name is required"
          />
          <TextInput
            property="level"
            label="Level*"
            errors={errors}
            control={control}
            required="Level is required"
            rules={{
              pattern: {
                value: /^[0-9]+$/,
                message: "Level must be an integer",
              },
            }}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" className="flex-1">
            Add Item Class
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
