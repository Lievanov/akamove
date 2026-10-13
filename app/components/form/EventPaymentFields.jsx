"use client";
import { Combobox } from "@/app/components/ui/Combobox";
import TextInput from "@/app/components/ui/TextInput";

const EventPaymentFields = ({
  control,
  errors,
  events,
  isEventPayment,
  onSelectEvent,
  renderPaymentAmountField,
}) => {
  return (
    <>
      {isEventPayment && (
        <div className="space-y-4">
          <Combobox
            label="Event"
            property="event_id"
            errors={errors}
            control={control}
            rules={{
              validate: (value) =>
                !isEventPayment || value ? true : "Event is required",
            }}
            options={events}
            getOptionLabel={(option) => option?.event_name || ""}
            getOptionValue={(option) => option?.id ?? option}
            placeholder={events.length ? "Select Event" : "No active events"}
            onSelectOption={onSelectEvent}
          />
          <TextInput
            label="Client's Name"
            property="client_name"
            errors={errors}
            control={control}
            rules={{
              validate: (value) =>
                !isEventPayment || (value && value.trim() !== "")
                  ? true
                  : "Client name is required",
            }}
            placeholder="Client full name"
          />
          {renderPaymentAmountField()}
        </div>
      )}
    </>
  );
};

export default EventPaymentFields;
