"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getLocationById, updateLocation } from "@/api/location/location";
import LocationForm from "@/app/components/form/LocationForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";

function UpdateLocation() {
  const router = useRouter();
  const { locationId } = useParams();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      setLocation(await getLocationById(locationId));
      setLoading(false);
    };
    fetchLocation();
  }, []);

  const onSubmit = async (data) => {
    const success = await updateLocation({ id: locationId, ...data });
    if (success) {
      router.push(
        `/dashboard/locations?text=Location+updated.&severity=success`
      );
    } else {
      setAlert({
        text: "Couldn't update the location. Check your connection and try again.",
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
      <PageHeader title="Update location" breadcrumbs={[{ label: "Locations", href: "/dashboard/locations" }]} />
      <LocationForm onSubmit={onSubmit} location={location} />
    </>
  );
}

export default UpdateLocation;
