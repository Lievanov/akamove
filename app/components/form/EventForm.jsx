"use client";
import moment from "moment";
import { useForm } from "react-hook-form";
import TextInput from "@/app/components/ui/TextInput";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";

function EventForm({ onSubmit, data, isReadOnly = false }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      event_name: data?.event_name ?? "",
      event_price: data?.event_price ?? "",
      date_of_event_price: data?.date_of_event_price ?? "",
      event_date: data?.event_date ? moment(data.event_date).toDate() : null,
    },
  });

  const submitForm = async (formData) => {
    const submitData = {
      ...formData,
      event_date: formData.event_date
        ? moment(formData.event_date).format("YYYY-MM-DD")
        : null,
    };

    await onSubmit(submitData);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
        <form onSubmit={handleSubmit(submitForm)}>
          <div className="space-y-4 border-t border-brand-dark/10 pt-6">
            <TextInput
              property="event_name"
              label="Event Name"
              control={control}
              errors={errors}
              required="Event name is required"
              disabled={isReadOnly}
            />
            <TextInput
              property="event_price"
              label="Event Price"
              control={control}
              errors={errors}
              required="Event price is required"
              type="number"
              step="0.01"
              prefix="$"
              disabled={isReadOnly}
            />
            <TextInput
              property="date_of_event_price"
              label="Date of Event Price"
              control={control}
              errors={errors}
              required="Date of event price is required"
              type="number"
              step="1"
              prefix="$"
              disabled={isReadOnly}
            />
            <DatePicker
              label="Event Date"
              property="event_date"
              errors={errors}
              control={control}
              required="Event date is required"
              disabled={isReadOnly}
            />
          </div>
          {!isReadOnly && (
            <div className="mt-6 flex justify-end gap-2">
              <BackButton />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : data ? "Update Event" : "Create Event"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default EventForm;
