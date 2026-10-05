"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById } from "@/api/events/events";
import { createEventPayment } from "@/api/events/event_payment";
import PaymentForm from "@/app/components/form/PaymentForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getLatestPeriod } from "@/api/period/period";

function EventPayment() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [event, setEvent] = useState({});
  const [period, setPeriod] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getEvent();
  }, []);

  const getEvent = async () => {
    const [eventData, latestPeriod] = await Promise.all([
      getEventById(id),
      getLatestPeriod(),
    ]);
    setEvent(eventData);
    setPeriod(latestPeriod);
    setLoading(false);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const today = new Date().toISOString().split("T")[0];
    const result = await createEventPayment({
      event_id: data.event_id || event.id,
      payment_date: today,
      payment_amount: parseFloat(data.payment_amount),
      client_name: data.client_name || "Unknown",
    });

    if (result) {
      router.push("/dashboard/events");
    } else {
      setAlert({
        text: "Couldn't add the payment. Check your connection and try again.",
        severity: "error",
      });
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loading variant="form-page" />;

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          duration={5000}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader
        title={event.event_name ? `Record payment: ${event.event_name}` : "Record event payment"}
        breadcrumbs={[{ label: "Events", href: "/dashboard/events" }]}
      />
      <PaymentForm
        onSubmit={onSubmit}
        period={period || { id: "", name: "", prices: [] }}
        defaultIsEventPayment={true}
        presetEvent={event}
        showEventToggle={false}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

export default EventPayment;
