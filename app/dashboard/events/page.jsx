"use client";
import { useEffect, useState, useRef } from "react";
import { getEventCountFiltered, getEvents } from "@/api/events/events";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import { Pencil } from "lucide-react";
import Loading from "@/app/components/Loading";
import { formatDate } from "@/app/components/utils/utils";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Input } from "@/app/components/ui/Input";
import { Pagination } from "@/app/components/ui/Pagination";
import { Chip } from "@/app/components/ui/Chip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

function Events() {
  const router = useRouter();
  const ITEMS_PER_PAGE = 10;

  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const { activeTenant, tenantsLoading } = useActiveTenant();

  const debouncedSearch = useRef(
    debounce(async (value) => {
      retrieveEventList(value);
    }, 500)
  ).current;

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
      if (!["admin", "staff"].includes(role)) {
        router.push("/dashboard/access-denined");
        return;
      }

      setIsAdmin(role === "admin");
      setAccessChecked(true);
    };

    checkAccess();
  }, [router, activeTenant?.id, tenantsLoading]);

  useEffect(() => {
    if (!accessChecked) return;
    retrieveEventList(searchTerm);
  }, [page, accessChecked]);

  useEffect(() => {
    if (!accessChecked) return;
    debouncedSearch(searchTerm);
  }, [searchTerm, accessChecked]);

  const retrieveEventList = async (value) => {
    setEvents([]);
    setLoading(true);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const eventData = await getEvents(start, end, value ? value : "");
    setEvents(eventData);
    const count = await getEventCountFiltered(value ? value : "");
    setTotalItems(count);
    setLoading(false);
  };

  const handleChange = (event) => {
    const { value } = event.target;
    setSearchTerm(value);
    handlePagination(1);
  };

  const handlePagination = (value) => {
    setPage(value);
  };

  if (loading || !accessChecked) return <Loading />;

  return (
    <>
      <PageHeader title="Events" />
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
          {isAdmin && (
            <Button onClick={() => router.push("/dashboard/events/new")}>
              Add new event
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-brand-dark/10 p-2">
          <div className="mb-4">
            <Input
              id="searchTerm"
              placeholder="Search by Event Name"
              value={searchTerm}
              onChange={handleChange}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Event Price</TableHead>
                <TableHead>Date of Event Price</TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((row) => {
                const toLocalDateString = (date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  return `${year}-${month}-${day}`;
                };
                const eventDateOnly = (row.event_date || "").split("T")[0];
                const todayDateOnly = toLocalDateString(new Date());
                const isUpcomingOrToday =
                  eventDateOnly && eventDateOnly >= todayDateOnly;

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium text-brand-pink hover:underline"
                        onClick={() => router.push(`/dashboard/events/${row.id}`)}
                      >
                        {row.event_name}
                      </button>
                    </TableCell>
                    <TableCell>{formatDate(row.event_date)}</TableCell>
                    <TableCell>
                      ${row.event_price ? row.event_price.toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell>
                      ${row.date_of_event_price ? Number(row.date_of_event_price).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell>
                      {isUpcomingOrToday ? (
                        <Button
                          variant="secondary"
                          onClick={() => router.push(`/dashboard/events/${row.id}/payment`)}
                        >
                          New Payment
                        </Button>
                      ) : (
                        <Chip label="ENDED" className="bg-brand-dark/40" />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="Edit event"
                        onClick={() => router.push(`/dashboard/events/${row.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Pagination
              page={page}
              totalItems={totalItems}
              pageSize={ITEMS_PER_PAGE}
              onChange={handlePagination}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Events;
