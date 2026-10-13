"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getAllClasses } from "@/api/class/class";
import Loading from "../Loading";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";
import TextInput from "@/app/components/ui/TextInput";
import { Select } from "@/app/components/ui/Select";
import { Combobox } from "@/app/components/ui/Combobox";
import { Checkbox } from "@/app/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { Input } from "@/app/components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/Tabs";
import { getLastestThreePeriods } from "@/api/period/period";
import { getUpcomingEvents } from "@/api/events/events";
import { getTimezone, DEFAULT_TIMEZONE } from "@/api/settings/settings";
import { getTodayInTimezone } from "../utils/utils";
import EventPaymentFields from "./EventPaymentFields";

export const PAYMENT_METHODS = ["Card", "Cash", "Venmo", "Groupon", "Gift Certificate"];

const PaymentForm = ({
  onSubmit,
  period,
  payment,
  student,
  defaultIsEventPayment = false,
  presetEvent = null,
  showEventToggle = true,
  isSubmitting = false,
  // Optional "Punch pass" tab content (a pass sale isn't a payment row).
  punchPassPanel = null,
  defaultTab = "classes",
}) => {
  const [classes, setClasses] = useState([]);
  const [studentClass, setStudentClass] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [isEventPayment, setIsEventPayment] = useState(defaultIsEventPayment);
  const [tab, setTab] = useState(defaultIsEventPayment ? "event" : defaultTab);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [useCredit, setUseCredit] = useState(null); // null = not decided yet
  const [originalCredit, setOriginalCredit] = useState(0);
  const [pendingBaseAmount, setPendingBaseAmount] = useState(null);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      payment_amount: "",
      payment_method: "Card",
      event_id: null,
      client_name: "",
      notes: "",
      credit: "",
      period_id: "",
      is_dropout: false,
    },
  });

  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatMoney = (value) => {
    const num = toNumber(value);
    return num ? num.toFixed(2) : "0.00";
  };

  const watchedCredit = watch("credit");
  const creditTaken = Math.max(0, originalCredit - toNumber(watchedCredit));
  const hasStudent = !!(student && student.id);

  const applyCreditToBaseAmount = (baseAmount) => {
    const base = Math.max(0, toNumber(baseAmount));
    const creditToApply = Math.min(Math.max(0, originalCredit), base);
    const remainingCredit = Math.max(0, originalCredit - creditToApply);

    // Keep the original (base) amount, and discount from credit instead.
    setValue("payment_amount", formatMoney(base));
    setValue("credit", formatMoney(remainingCredit));
  };

  const getClasses = async () => {
    const classList = await getAllClasses();
    setClasses(classList);
    return classList;
  };

  useEffect(() => {
    initEditPayment();
  }, []);

  useEffect(() => {
    setIsEventPayment(defaultIsEventPayment);
  }, [defaultIsEventPayment]);

  // Tabs pick what's being paid for; editing keeps the payment's own kind.
  const showTabs = showEventToggle && !payment;
  const onTabChange = (value) => {
    setTab(value);
    if (value !== "punch-pass") setIsEventPayment(value === "event");
  };

  const initEditPayment = async () => {
    const classList = await getClasses();
    setPeriods(await getLastestThreePeriods());
    const eventList = await getUpcomingEvents();
    setEvents(eventList || []);
    const configuredTimezone = await getTimezone();
    setTimezone(configuredTimezone);
    if (period?.id) {
      setValue("period_id", period.id);
    }

    // Set current student credit and notes
    if (student && student.credit !== undefined) {
      const startingCredit = toNumber(student.credit);
      setOriginalCredit(startingCredit);
      setValue("credit", formatMoney(startingCredit));
    }
    if (student && student.notes !== undefined) {
      setValue("notes", student.notes);
    }
    if (presetEvent?.id) {
      setValue("event_id", presetEvent.id);
      const presetName =
        presetEvent.client_name ||
        `${presetEvent.client_first_name || ""} ${presetEvent.client_last_name || ""}`.trim();
      if (presetName) {
        setValue("client_name", presetName);
      }
      if (!payment) {
        handleEventSelect(presetEvent, configuredTimezone);
      }
    }
    if (
      student &&
      student.first_name &&
      student.last_name &&
      (!payment || !payment.client_name)
    ) {
      setValue("client_name", `${student.first_name} ${student.last_name}`);
    }

    if (payment) {
      setIsEdit(true);
      const { period_id, payment_amount, payment_method, is_dropout } = payment;
      setValue("period_id", period_id);
      setValue("payment_amount", payment_amount);
      setValue("payment_method", payment_method);
      setValue("is_dropout", is_dropout);

      const selectedClasses = classList.filter((item) =>
        payment.classes.includes(item.id)
      );
      setStudentClass(selectedClasses);
    } else {
      setValue("payment_method", "Card");
    }
    setLoading(false);
  };

  const preSubmit = async (data) => {
    if (isSubmitting) return;

    // Additional protection - disable the form during submission
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    data.classes = studentClass.map((item) => item["id"]);
    data.is_event_payment = isEventPayment;
    await onSubmit(data);
  };

  const classOnChange = (value) => {
    setStudentClass(value);

    if (!isEdit) {
      if (value.length === 0) {
        setPendingBaseAmount(null);
        setValue("payment_amount", "");
        if (useCredit === true) {
          setValue("credit", formatMoney(originalCredit));
        }
        return;
      }

      const pricesLength = period.prices.length;
      const baseAmount =
        value.length > pricesLength
          ? period.prices[pricesLength - 1]
          : period.prices[value.length - 1];

      const base = toNumber(baseAmount);
      setPendingBaseAmount(base);

      if (useCredit === true) {
        applyCreditToBaseAmount(base);
        return;
      }

      setValue("payment_amount", formatMoney(base));

      if (
        useCredit === null &&
        value.length > 0 &&
        base > 0 &&
        originalCredit > 0
      ) {
        setCreditDialogOpen(true);
      }
    }
  };

  const handleEventSelect = (eventOption, tzOverride) => {
    if (!eventOption) return;
    const today = getTodayInTimezone(tzOverride || timezone);
    const isSameDay =
      eventOption.event_date &&
      eventOption.event_date.toString().slice(0, 10) === today;
    const amount = isSameDay
      ? eventOption.date_of_event_price
      : eventOption.event_price;
    if (amount === undefined || amount === null) return;

    const base = toNumber(amount);

    if (useCredit === true) {
      applyCreditToBaseAmount(base);
    } else {
      setValue("payment_amount", formatMoney(base));
    }

    // Offer to apply existing credit toward the event, mirroring class payments.
    setPendingBaseAmount(base);
    if (!isEdit && useCredit === null && base > 0 && originalCredit > 0) {
      setCreditDialogOpen(true);
    }
  };

  if (loading) return <Loading variant="form" />;

  const renderPaymentAmountField = () => (
    <TextInput
      label="Payment Amount"
      property="payment_amount"
      errors={errors}
      control={control}
      rules={{
        required: "Payment Amount is required",
        pattern: {
          value: /^\d+(\.\d{1,2})?$/,
          message: "Invalid amount format",
        },
      }}
      placeholder="0.00"
      prefix="$"
    />
  );

  const renderCreditFields = () => (
    <>
      <TextInput
        label="Credit"
        property="credit"
        errors={errors}
        control={control}
        rules={{
          pattern: {
            value: /^\d*(\.\d{1,2})?$/,
            message: "Invalid credit format",
          },
        }}
        placeholder="0.00"
        prefix="$"
        disabled={useCredit === true}
      />
      {creditTaken > 0 ? (
        <div className="w-full">
          <label
            htmlFor="credit-applied"
            className="mb-1 block text-sm font-medium text-brand-dark"
          >
            Credit applied
          </label>
          <Input
            id="credit-applied"
            value={formatMoney(creditTaken)}
            readOnly
            prefix="$"
            className="border-transparent bg-transparent font-bold text-brand-dark shadow-none"
          />
        </div>
      ) : null}
    </>
  );

  const paymentForm = (
    <form onSubmit={handleSubmit(preSubmit)}>
      <div className={showTabs ? "space-y-4" : "space-y-4 border-t border-brand-dark/10 pt-6"}>
        {!isEventPayment && period?.name && (
          <p className="pb-1 text-base text-brand-dark/60">
            Current Period: {period.name}
          </p>
        )}
        <EventPaymentFields
          control={control}
          errors={errors}
          events={events}
          isEventPayment={isEventPayment}
          onSelectEvent={handleEventSelect}
          renderPaymentAmountField={renderPaymentAmountField}
        />

        {isEventPayment && hasStudent ? renderCreditFields() : null}

        {isEventPayment ? null : (
          <>
            <Select
              label="Select Period"
              property="period_id"
              errors={errors}
              control={control}
              required="Period is required"
              options={(periods || []).map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />

            <Combobox
              label="Select Classes"
              value={studentClass}
              onChange={classOnChange}
              options={classes}
              getOptionLabel={(option) => option?.label ?? option?.name ?? ""}
              multiple
              placeholder="Select a Class"
            />

            {renderPaymentAmountField()}

            <Select
              label="Payment Method"
              property="payment_method"
              errors={errors}
              control={control}
              required="Payment Method is required"
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            />

            <Checkbox
              property="is_dropout"
              label="Is Drop-In Student"
              control={control}
            />

            {renderCreditFields()}

            <TextInput
              label="Notes"
              property="notes"
              errors={errors}
              control={control}
              placeholder="Payment notes..."
              rows={3}
            />
          </>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <BackButton routeTo="/dashboard/students" />
        <Button type="submit" autoFocus disabled={isSubmitting}>
          {isSubmitting
            ? "Processing..."
            : `${payment ? "Update" : "Submit"} Payment`}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogTitle>Use existing credit?</DialogTitle>
          <p className="text-sm text-brand-dark/70">
            This student has ${formatMoney(originalCredit)} in credit. Apply it
            to this payment?
          </p>
          <DialogActions>
            <Button
              variant="ghost"
              onClick={() => {
                setUseCredit(false);
                setCreditDialogOpen(false);
              }}
            >
              No
            </Button>
            <Button
              onClick={() => {
                setUseCredit(true);
                setCreditDialogOpen(false);
                const base =
                  pendingBaseAmount !== null
                    ? pendingBaseAmount
                    : toNumber(getValues("payment_amount"));
                applyCreditToBaseAmount(base);
              }}
            >
              Yes
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
        {showTabs ? (
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="mb-6">
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="event">Event</TabsTrigger>
              {punchPassPanel && (
                <TabsTrigger value="punch-pass">Punch pass</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="classes" className="p-0">
              {paymentForm}
            </TabsContent>
            <TabsContent value="event" className="p-0">
              {paymentForm}
            </TabsContent>
            {punchPassPanel && (
              <TabsContent value="punch-pass" className="p-0">
                {punchPassPanel}
              </TabsContent>
            )}
          </Tabs>
        ) : (
          paymentForm
        )}
      </div>
    </div>
  );
};

export default PaymentForm;
