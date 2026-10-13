"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import moment from "moment";
import { Button } from "@/app/components/ui/Button";
import { BackButton } from "@/app/components/ui/BackButton";
import TextInput from "@/app/components/ui/TextInput";
import { Select } from "@/app/components/ui/Select";
import { DatePicker } from "@/app/components/ui/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { sellPass, updatePass, expiryFromValidity } from "@/api/punch_pass/punch_pass";
import { PAYMENT_METHODS } from "./PaymentForm";
import { formatMoney } from "../utils/utils";

const CUSTOM_TYPE = "custom";

const toDate = (isoDate) => (isoDate ? moment(isoDate, "YYYY-MM-DD").toDate() : null);
const toIsoDate = (date) => (date ? moment(date).format("YYYY-MM-DD") : null);

// Sell a pass to a student (`pass` null) or correct/extend one already sold.
// Picking a pass type fills in its name, entries, price and expiry; every
// field can still be changed for this sale. `inline` renders the form on the
// page (the Record payment card) instead of in a dialog.
const PunchPassForm = ({
  open = true,
  onOpenChange,
  studentId,
  pass,
  passTypes = [],
  onSaved,
  inline = false,
}) => {
  const isEdit = !!pass;
  const offeredTypes = passTypes.filter((type) => type.is_active);

  // A new sale starts from the first offered pass type.
  const initialValues = () => {
    if (pass) {
      return {
        name: pass.name,
        total_entries: pass.total_entries,
        price: pass.price,
        payment_method: pass.payment_method ?? "Card",
        purchased_on: toDate(pass.purchased_on),
        expires_on: toDate(pass.expires_on),
        notes: pass.notes ?? "",
      };
    }
    const firstType = offeredTypes[0];
    const purchasedOn = new Date();
    return {
      pass_type_id: firstType?.id ?? CUSTOM_TYPE,
      name: firstType?.name ?? "",
      total_entries: firstType?.total_entries ?? "",
      price: firstType?.price ?? "",
      payment_method: "Card",
      purchased_on: purchasedOn,
      expires_on: toDate(expiryFromValidity(toIsoDate(purchasedOn), firstType?.validity_days)),
      notes: "",
    };
  };

  // Default values (not just the reset below) so the inline form's selects
  // mount with a value: Radix Select doesn't show one set after mount.
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: initialValues() });
  const [error, setError] = useState("");
  const typeId = watch("pass_type_id");
  const expiresOn = watch("expires_on");

  useEffect(() => {
    if (!open) return;
    setError("");
    reset(initialValues());
  }, [open, pass]);

  const applyType = (id) => {
    const type = passTypes.find((t) => t.id === id);
    if (!type) return;
    setValue("name", type.name);
    setValue("total_entries", type.total_entries);
    setValue("price", type.price);
    setValue(
      "expires_on",
      toDate(expiryFromValidity(toIsoDate(getValues("purchased_on")), type.validity_days))
    );
  };

  // Keep a type's validity window anchored to the purchase date.
  const onPurchaseDateChange = (date) => {
    setValue("purchased_on", date);
    const type = passTypes.find((t) => t.id === getValues("pass_type_id"));
    if (!isEdit && type?.validity_days) {
      setValue("expires_on", toDate(expiryFromValidity(toIsoDate(date), type.validity_days)));
    }
  };

  const onSubmit = async (data) => {
    const values = {
      name: data.name,
      total_entries: Number(data.total_entries),
      price: Number(data.price),
      payment_method: data.payment_method,
      purchased_on: toIsoDate(data.purchased_on),
      expires_on: toIsoDate(data.expires_on),
      notes: data.notes,
    };
    if (values.expires_on && values.expires_on < values.purchased_on) {
      setError("The expiry date can't be before the purchase date.");
      return;
    }
    const { error: saveError } = isEdit
      ? await updatePass(pass.id, values)
      : await sellPass({
          ...values,
          student_id: studentId,
          pass_type_id: data.pass_type_id === CUSTOM_TYPE ? null : data.pass_type_id,
        });
    if (saveError) setError(saveError);
    else onSaved(isEdit ? "Pass updated." : "Pass sold.");
  };

  const typeOptions = [
    ...offeredTypes.map((type) => ({
      value: type.id,
      label: `${type.name} · ${type.total_entries} entries · ${formatMoney(type.price)}`,
    })),
    { value: CUSTOM_TYPE, label: "Custom pass" },
  ];

  const submitButton = (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : isEdit ? "Save" : "Sell pass"}
    </Button>
  );

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!isEdit && (
        <Select
          label="Pass"
          value={typeId}
          onChange={(value) => {
            setValue("pass_type_id", value);
            applyType(value);
          }}
          options={typeOptions}
        />
      )}
      <TextInput
        property="name"
        label="Name"
        placeholder="10-class pass"
        errors={errors}
        control={control}
        required="Name is required"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          property="total_entries"
          label="Entries"
          type="number"
          step="1"
          min="1"
          errors={errors}
          control={control}
          required="Entries are required"
          rules={{
            validate: (v) => {
              const n = Number(v);
              if (!Number.isInteger(n) || n < 1) return "Use a whole number above 0";
              if (isEdit && n < (pass.entries?.length ?? 0))
                return `${pass.entries.length} entries are already used`;
              return true;
            },
          }}
        />
        <TextInput
          property="price"
          label="Price"
          type="number"
          step="0.01"
          min="0"
          prefix="$"
          errors={errors}
          control={control}
          required="Price is required"
          rules={{ validate: (v) => Number(v) >= 0 || "Price can't be negative" }}
        />
      </div>
      <Select
        label="Payment Method"
        property="payment_method"
        errors={errors}
        control={control}
        required="Payment method is required"
        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DatePicker
          label="Purchase date"
          value={watch("purchased_on")}
          onChange={onPurchaseDateChange}
        />
        <div>
          <DatePicker
            label="Expires"
            property="expires_on"
            control={control}
            errors={errors}
            placeholder="No expiry"
            endMonth={moment().add(5, "years").toDate()}
          />
          {expiresOn && (
            <button
              type="button"
              onClick={() => setValue("expires_on", null)}
              className="mt-1 text-sm text-brand-dark/60 underline hover:text-brand-dark"
            >
              Remove expiry
            </button>
          )}
        </div>
      </div>
      <TextInput
        property="notes"
        label="Notes"
        rows={2}
        errors={errors}
        control={control}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {inline ? (
        <div className="mt-6 flex justify-end gap-2">
          <BackButton routeTo="/dashboard/students" />
          {submitButton}
        </div>
      ) : (
        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {submitButton}
        </DialogActions>
      )}
    </form>
  );

  if (inline) return form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? "Edit pass" : "Sell a punch pass"}</DialogTitle>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default PunchPassForm;
