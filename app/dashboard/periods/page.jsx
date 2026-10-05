"use client";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarRange, Pencil } from "lucide-react";
import { formatDate } from "@/app/components/utils/utils";
import { getPeriodCount, getPeriods } from "@/api/period/period";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import {
  ServerTableCard,
  rowLinkClass,
} from "@/app/components/ui/ServerTableCard";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
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

const fetchPeriods = async ({ from, to }) => {
  const [rows, count] = await Promise.all([
    getPeriods(from, to),
    getPeriodCount(),
  ]);
  return { rows, count };
};

// Dates come back as "YYYY-MM-DD" (or full timestamps); compare the date
// part as strings so timezones can't shift a period's status.
const dateOnly = (value) => (value ? String(value).split("T")[0] : "");

const periodStatus = (row, today) => {
  const start = dateOnly(row.start_date);
  const end = dateOnly(row.end_date);
  if (start && today < start) return { label: "Upcoming", tone: "warning" };
  if (end && today > end) return { label: "Ended", tone: "neutral" };
  return { label: "Current", tone: "success" };
};

function Periods() {
  const [alert, setAlert] = useFlashAlert();
  const table = useServerTable({ fetchPage: fetchPeriods });
  usePageTour(TOURS.periods, { ready: !table.isLoading });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const addPeriodButton = (
    <Link
      href="/dashboard/periods/new"
      data-tour="periods-add"
      className={buttonVariants()}
    >
      Add period
    </Link>
  );

  return (
    <>
      <PageHeader title="Periods" actions={addPeriodButton} />
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
            icon={CalendarRange}
            title="No periods yet"
            description="A period is one session of classes, like “May 2026”, with its own dates, prices and weekly schedule. Set up your locations and classes first, then create your first period."
            action={addPeriodButton}
          />
        ) : (
          <ServerTableCard table={table} noun={["period", "periods"]}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, i) => {
                  const status = periodStatus(row, today);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/periods/${row.id}/report`}
                          className={rowLinkClass}
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.start_date)} – {formatDate(row.end_date)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Chip label={status.label} tone={status.tone} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/periods/${row.id}/report`}
                            data-tour={i === 0 ? "periods-report" : undefined}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Report
                          </Link>
                          <Link
                            href={`/dashboard/periods/${row.id}`}
                            aria-label={`Update ${row.name}`}
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

export default function PeriodsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Periods />
    </Suspense>
  );
}
