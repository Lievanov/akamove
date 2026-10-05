"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById, updateEvent } from "@/api/events/events";
import EventForm from "@/app/components/form/EventForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import EventPaymentsList from "@/app/components/lists/EventPaymentsList";

function ViewEvent() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [event, setEvent] = useState({});

  useEffect(() => {
    getEvent();
  }, []);

  const getEvent = async () => {
    setEvent(await getEventById(id));
    setLoading(false);
  };

  const onSubmit = async (data) => {
    if (await updateEvent(id, data)) {
      setAlert({ text: "Event updated.", severity: "success" });
    } else
      setAlert({
        text: "Couldn't update the event. Check your connection and try again.",
        severity: "error",
      });
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
      <PageHeader title={event.event_name} breadcrumbs={[{ label: "Events", href: "/dashboard/events" }]} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EventForm onSubmit={onSubmit} data={event} isReadOnly={true} />
        <EventPaymentsList eventId={id} eventName={event.event_name} />
      </div>
    </>
  );
}

export default ViewEvent;
