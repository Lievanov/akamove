"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";
import TextInput from "@/app/components/ui/TextInput";

const InstructorForm = ({ onSubmit, instructor }) => {
  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (instructor) {
      setValue("name", instructor.name);
    }
  }, [instructor]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <div className="my-6 rounded-lg border border-brand-dark/10 p-6 md:my-10 md:p-8">
        <h1 className="text-center text-2xl font-semibold text-brand-dark">
          {instructor ? "Update" : "New"} Instructor
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
          <div className="space-y-4 border-t border-brand-dark/10 pt-6">
            <TextInput
              property="name"
              label="Instructor Name*"
              errors={errors}
              control={control}
              required="Name is required"
              placeholder="Jane Doe"
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <BackButton routeTo="/dashboard/instructors" />
            <Button type="submit" autoFocus>
              {instructor ? "Update" : "Create"} Instructor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstructorForm;
