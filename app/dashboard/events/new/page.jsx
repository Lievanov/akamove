"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createEvent } from "@/api/events/events";
import EventForm from "@/app/components/form/EventForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";

function NewEvent() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });
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

  const onSubmit = async (data) => {
    const result = await createEvent(data);

    if (result !== false) {
      router.push(
        `/dashboard/events?text=Event+successfully+created!&severity=success`
      );
    } else {
      setAlert({
        text: "Failed to create event, please contact web admin!",
        severity: "error",
      });
    }
  };

  if (checkingAccess) return <Loading />;

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
      <PageHeader title="Create New Event" />
      <EventForm onSubmit={onSubmit} />
    </>
  );
}

export default NewEvent;
