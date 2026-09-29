"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocations, getLocationCount } from "@/api/location/location";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import { Pencil } from "lucide-react";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { Pagination } from "@/app/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

function Locations() {
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const { activeTenant, tenantsLoading } = useActiveTenant();

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const text = urlSearchParams.get("text");
    const severity = urlSearchParams.get("severity");
    if (text && severity) setAlert({ text, severity });
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.push("/dashboard/access-denined");
        return;
      }
      if (tenantsLoading) return;
      const role = await getUserRoleForTenant(user.id, activeTenant?.id);
      if (role !== "admin") {
        router.push("/dashboard/access-denined");
        return;
      }
      setAccessChecked(true);
    };
    checkAccess();
  }, [router, activeTenant?.id, tenantsLoading]);

  useEffect(() => {
    if (!accessChecked) return;
    retrieveLocationList();
  }, [page, accessChecked]);

  const retrieveLocationList = async () => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const [data, count] = await Promise.all([
      getLocations(start, end),
      getLocationCount(),
    ]);
    setLocations(data);
    setTotalItems(count);
    setLoading(false);
  };

  if (loading || !accessChecked) return <Loading />;

  return (
    <>
      <PageHeader title="Locations" />
      <div className="mx-auto mb-8 max-w-5xl px-4">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6 flex justify-between">
          <Button onClick={() => router.push("/dashboard/locations/new")}>
            Add new Location
          </Button>
        </div>
        <div className="rounded-lg border border-brand-dark/10 p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.address}</TableCell>
                  <TableCell>{row.phone ?? "—"}</TableCell>
                  <TableCell>{row.capacity ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.is_active ? "Active" : "Inactive"}
                      className={
                        row.is_active ? "bg-green-600" : "bg-brand-dark/40"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      aria-label="Edit location"
                      onClick={() =>
                        router.push(`/dashboard/locations/${row.id}`)
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Pagination
              page={page}
              totalItems={totalItems}
              pageSize={ITEMS_PER_PAGE}
              onChange={setPage}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Locations;
