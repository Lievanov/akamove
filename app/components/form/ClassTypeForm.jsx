"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClassType } from "@/api/class/class_type";
import TextInput from "@/app/components/ui/TextInput";
import { Button } from "@/app/components/ui/Button";

const ClassTypeForm = ({ onSubmit }) => {
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

  const preSubmit = async (data) => {
    const classSaved = await createClassType(data);
    if (classSaved) cleanForm(false);
    await onSubmit(classSaved);
  };

  if (!displayForm)
    return (
      <div className="pt-4">
        <Button variant="outline" className="w-full" onClick={() => cleanForm(true)}>
          Create New Class
        </Button>
      </div>
    );

  return (
    <div className="my-2 rounded-lg border border-brand-dark/10 p-4">
      <h4 className="mb-3 text-center text-lg font-semibold text-brand-dark">
        New Class
      </h4>
      <form onSubmit={handleSubmit(preSubmit)}>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput
              property="name"
              label="Class Name*"
              errors={errors}
              control={control}
              required="Class Name is required"
            />
          </div>
          <Button type="submit">Create</Button>
          <Button variant="outline" onClick={() => cleanForm(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClassTypeForm;
