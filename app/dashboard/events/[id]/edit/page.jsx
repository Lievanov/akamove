"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById, updateEvent } from "@/api/events/events";
import EventForm from "@/app/components/form/EventForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";

function EditEvent() {
  const router = useRouter();
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
    const result = await updateEvent(id, data);

    if (result !== false) {
      router.push(
        `/dashboard/events?text=Event+updated.&severity=success`
      );
    } else {
      setAlert({
        text: "Couldn't update the event. Check your connection and try again.",
        severity: "error",
      });
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
      <PageHeader title="Update event" breadcrumbs={[{ label: "Events", href: "/dashboard/events" }]} />
      <EventForm onSubmit={onSubmit} data={event} />
    </>
  );
}

export default EditEvent;
