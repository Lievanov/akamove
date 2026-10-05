"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLocation } from "@/api/location/location";
import LocationForm from "@/app/components/form/LocationForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";

function NewLocation() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });

  const onSubmit = async (data) => {
    const success = await createLocation(data);
    if (success) {
      router.push(
        `/dashboard/locations?text=Location+created.&severity=success`
      );
    } else {
      setAlert({
        text: "Couldn't create the location. Check your connection and try again.",
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
      <PageHeader title="New location" breadcrumbs={[{ label: "Locations", href: "/dashboard/locations" }]} />
      <LocationForm onSubmit={onSubmit} />
    </>
  );
}

export default NewLocation;
