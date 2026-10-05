"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEvent } from "@/api/events/events";
import EventForm from "@/app/components/form/EventForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";

function NewEvent() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });

  const onSubmit = async (data) => {
    const result = await createEvent(data);

    if (result !== false) {
      router.push(
        `/dashboard/events?text=Event+created.&severity=success`
      );
    } else {
      setAlert({
        text: "Couldn't create the event. Check your connection and try again.",
        severity: "error",
      });
    }
  };

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
      <PageHeader title="New event" breadcrumbs={[{ label: "Events", href: "/dashboard/events" }]} />
      <EventForm onSubmit={onSubmit} />
    </>
  );
}

export default NewEvent;
