"use client";
import { useEffect, useState } from "react";
import moment from "moment";
import { useForm } from "react-hook-form";
import { formatPhoneNumber } from "../utils/utils";
import TextInput from "@/app/components/ui/TextInput";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";

function StudentForm({ onSubmit, data, isReadOnly = false }) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const [studentId, setId] = useState(null);

  useEffect(() => {
    initEditStudent();
  }, []);

  const initEditStudent = async () => {
    if (data) {
      const {
        id,
        date_of_birth,
        email,
        first_name,
        last_name,
        is_active,
        notes,
        phone,
        credit,
      } = data;
      setId(id);
      setValue("id", id);
      setValue("first_name", first_name);
      setValue("last_name", last_name);
      setValue("email", email);
      setValue("phone", phone);
      setValue("is_active", is_active);
      if (date_of_birth) {
        const momentFormatDate = moment(date_of_birth, "YYYY/MM/DD");
        setValue("date_of_birth", momentFormatDate.toDate());
      }
      setValue("notes", notes);
      setValue("credit", credit || 0);
    }
  };

  const preSubmit = async (formData) => {
    const submitData = { ...formData };
    submitData.date_of_birth = formData.date_of_birth
      ? moment(formData.date_of_birth).format("MM/DD/YYYY")
      : null;
    await onSubmit(submitData);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
        <form onSubmit={handleSubmit(preSubmit)}>
          <div className="space-y-4 border-t border-brand-dark/10 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="First Name"
                property="first_name"
                errors={errors}
                control={control}
                required="First name is required"
                placeholder="John"
                disabled={isReadOnly}
              />
              <TextInput
                label="Last Name"
                property="last_name"
                errors={errors}
                control={control}
                required="Last name is required"
                placeholder="Doe"
                disabled={isReadOnly}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Email"
                property="email"
                errors={errors}
                control={control}
                placeholder="email@provider.com"
                disabled={isReadOnly}
              />
              <TextInput
                label="Phone Number"
                property="phone"
                errors={errors}
                control={control}
                placeholder={isReadOnly ? "" : "(123) 456-7890"}
                disabled={isReadOnly}
                format={formatPhoneNumber}
                parse={(value) => value.replace(/\D/g, "")}
              />
            </div>
            <DatePicker
              label="Date Of Birth"
              property="date_of_birth"
              errors={errors}
              control={control}
              disabled={isReadOnly}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Credit"
                property="credit"
                errors={errors}
                control={control}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                disabled={isReadOnly}
              />
              <TextInput
                label="Notes"
                property="notes"
                errors={errors}
                control={control}
                placeholder="Medical conditions, Allergies, etc..."
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>
          {!isReadOnly && (
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <BackButton />
              <Button type="submit" autoFocus disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : studentId ? "Update student" : "Create student"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default StudentForm;
