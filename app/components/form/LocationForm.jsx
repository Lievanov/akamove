"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";
import { Switch } from "@/app/components/ui/Switch";
import TextInput from "@/app/components/ui/TextInput";

const LocationForm = ({ onSubmit, location }) => {
  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { is_active: true } });

  useEffect(() => {
    if (location) {
      setValue("name", location.name);
      setValue("address", location.address);
      setValue("phone", location.phone ?? "");
      setValue("capacity", location.capacity ?? "");
      setValue("is_active", location.is_active);
      setValue("notes", location.notes ?? "");
    }
  }, [location]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 border-t border-brand-dark/10 pt-6">
            <TextInput
              property="name"
              label="Location Name"
              errors={errors}
              control={control}
              required="Name is required"
              placeholder="Downtown Studio"
            />
            <TextInput
              property="address"
              label="Address"
              errors={errors}
              control={control}
              required="Address is required"
              placeholder="123 Main St, Indianapolis, IN 46201"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                property="phone"
                label="Phone"
                errors={errors}
                control={control}
                placeholder="(317) 555-0100"
              />
              <TextInput
                property="capacity"
                label="Capacity"
                errors={errors}
                control={control}
                placeholder="30"
                type="number"
              />
            </div>
            <TextInput
              property="notes"
              label="Notes"
              errors={errors}
              control={control}
              placeholder="Parking available on the street. Enter through the side door."
              rows={3}
            />
            <div>
              <Switch property="is_active" label="Active" control={control} />
              <p className="mt-1 text-xs text-brand-dark/50">
                Only active locations get a schedule tab in new periods.
                Turning a location off keeps its past schedules and history.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <BackButton routeTo="/dashboard/locations" />
            <Button type="submit" autoFocus disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : `${location ? "Update" : "Create"} Location`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationForm;
