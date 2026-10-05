"use client";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarHeart, Pencil } from "lucide-react";
import { getEventCountFiltered, getEvents } from "@/api/events/events";
import { useActiveTenant } from "@/app/context/TenantContext";
import Loading from "@/app/components/Loading";
import { formatDate, formatMoney } from "@/app/components/utils/utils";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import { Toast } from "@/app/components/ui/Toast";
import { buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import {
  ServerTableCard,
  rowLinkClass,
} from "@/app/components/ui/ServerTableCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { useServerTable } from "@/app/components/utils/useServerTable";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";

const fetchEvents = async ({ from, to, search }) => {
  const [rows, count] = await Promise.all([
    getEvents(from, to, search),
    getEventCountFiltered(search),
  ]);
  return { rows, count };
};

// "YYYY-MM-DD" for today in the browser's timezone, to compare against
// the event's date-only value.
const todayDateOnly = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function Events() {
  const [alert, setAlert] = useFlashAlert();
  const table = useServerTable({ fetchPage: fetchEvents });
  usePageTour(TOURS.events, { ready: !table.isLoading });
  const { activeTenant } = useActiveTenant();
  const isAdmin = activeTenant?.role === "admin";
  const today = todayDateOnly();

  const addEventButton = isAdmin ? (
    <Link
      href="/dashboard/events/new"
      data-tour="events-add"
      className={buttonVariants()}
    >
      Add event
    </Link>
  ) : null;

  return (
    <>
      <PageHeader title="Events" actions={addEventButton} />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        {table.isLoading ? (
          <Loading variant="table" />
        ) : table.isEmpty ? (
          <EmptyState
            icon={CalendarHeart}
            title="No events yet"
            description={
              isAdmin
                ? "Add a workshop, social or showcase with an advance price and a day-of price, then record payments as people sign up."
                : "Once an admin adds an event, you can record payments for it here."
            }
            action={addEventButton}
          />
        ) : (
          <ServerTableCard
            table={table}
            noun={["event", "events"]}
            searchPlaceholder="Search by event name"
            searchTour="events-search"
          >
            <Table data-tour="events-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Advance price</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Day-of price</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row) => {
                  const eventDateOnly = (row.event_date || "").split("T")[0];
                  const isUpcomingOrToday =
                    eventDateOnly && eventDateOnly >= today;

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/events/${row.id}`}
                          className={rowLinkClass}
                        >
                          {row.event_name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.event_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.event_price ?? 0)}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {formatMoney(row.date_of_event_price ?? 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {isUpcomingOrToday ? (
                            <Link
                              href={`/dashboard/events/${row.id}/payment`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                            >
                              Record payment
                            </Link>
                          ) : (
                            <Chip label="Ended" tone="neutral" />
                          )}
                          <Link
                            href={`/dashboard/events/${row.id}/edit`}
                            aria-label={`Update ${row.event_name}`}
                            className={iconButtonClass}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ServerTableCard>
        )}
      </div>
    </>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Events />
    </Suspense>
  );
}
