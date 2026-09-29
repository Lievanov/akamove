"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById, updateEvent } from "@/api/events/events";
import EventForm from "@/app/components/form/EventForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";

function EditEvent() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [event, setEvent] = useState({});
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { activeTenant, tenantsLoading } = useActiveTenant();

  useEffect(() => {
    let isActive = true;
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.replace("/");
        return;
      }

      if (tenantsLoading) return;

      const role = await getUserRoleForTenant(user.id, activeTenant?.id);
      if (!["admin", "staff"].includes(role)) {
        router.replace("/dashboard/access-denined");
        return;
      }

      if (isActive) setCheckingAccess(false);
    };

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [router, activeTenant?.id, tenantsLoading]);

  useEffect(() => {
    if (checkingAccess) return;
    getEvent();
  }, [checkingAccess]);

  const getEvent = async () => {
    setEvent(await getEventById(id));
    setLoading(false);
  };

  const onSubmit = async (data) => {
    const result = await updateEvent(id, data);

    if (result !== false) {
      router.push(
        `/dashboard/events?text=Event+successfully+updated!&severity=success`
      );
    } else {
      setAlert({
        text: "Failed to update event, please contact web admin!",
        severity: "error",
      });
    }
  };

  if (checkingAccess || loading) return <Loading />;

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
      <PageHeader title="Edit Event" />
      <EventForm onSubmit={onSubmit} data={event} />
    </>
  );
}

export default EditEvent;
