"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInstructorCount, getInstructors } from "@/api/instructor/instructor";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import { Pencil } from "lucide-react";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Pagination } from "@/app/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

function Instructors() {
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const [instructors, setInstructors] = useState([]);
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
    retrieveInstructorList();
  }, [page, accessChecked]);

  const retrieveInstructorList = async () => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const data = await getInstructors(start, end);
    setInstructors(data);
    const count = await getInstructorCount();
    setTotalItems(count);
    setLoading(false);
  };

  if (loading || !accessChecked) return <Loading />;

  return (
    <>
      <PageHeader title="Instructors" />
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
          <Button onClick={() => router.push("/dashboard/instructors/new")}>
            Add new Instructor
          </Button>
        </div>
        <div className="rounded-lg border border-brand-dark/10 p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <IconButton
                      aria-label="Edit instructor"
                      onClick={() =>
                        router.push(`/dashboard/instructors/${row.id}`)
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

export default Instructors;
