"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { buttonVariants } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Alert } from "@/app/components/ui/Alert";
import { categoryDotFor } from "@/app/components/ui/ClassChips";
import { rowLinkClass } from "@/app/components/ui/ServerTableCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { cn } from "@/app/components/ui/utils/cn";
import Loading from "@/app/components/Loading";
import { PeriodPicker, useSelectedPeriod } from "@/app/components/PeriodPicker";
import { getClassCatalog } from "@/api/class/class_schedule";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";
import { formatTime } from "@/app/components/utils/utils";

// "Mon 6:00 PM · Downtown"
const slotLabel = (slot) =>
  `${slot.day_of_week.slice(0, 3)} ${formatTime(slot.class_time)} · ${slot.location_name}`;

// The studio's classes by type, each with its weekly schedule and how many
// students paid for it in the selected period. A class opens its roster.
function Classes() {
  const [alert, setAlert] = useFlashAlert();
  const { periods, period } = useSelectedPeriod();
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState(false);
  usePageTour(TOURS.classes, { ready: catalog !== null });

  useEffect(() => {
    if (period === undefined) return;
    getClassCatalog(period?.id).then((data) => {
      setLoadError(!data);
      setCatalog(data ?? []);
    });
  }, [period]);

  const rosterHref = (cls) =>
    period ? `/dashboard/classes/${cls.id}?periodId=${period.id}` : `/dashboard/classes/${cls.id}`;

  let body;
  if (catalog === null) {
    body = <Loading variant="table" />;
  } else if (loadError) {
    body = (
      <Alert severity="error">
        Couldn&apos;t load classes. Check your connection and refresh.
      </Alert>
    );
  } else if (catalog.length === 0) {
    body = (
      <EmptyState
        icon={Layers}
        title="No classes yet"
        description="Create a class type (a track like Salsa) and its levels in order — Salsa 1, Salsa 2, and so on. Then schedule them in a period."
        action={
          <Link href="/dashboard/classes/update" className={buttonVariants()}>
            Create your first class
          </Link>
        }
      />
    );
  } else {
    body = (
      <div className="space-y-4" data-tour="classes-table">
        {!period && (
          <Alert severity="info">
            No periods yet. Schedules and enrollments show up once a period schedules these classes.
          </Alert>
        )}
        {catalog.map((type) => (
          <section
            key={type.id}
            aria-labelledby={`type-${type.id}`}
            className="rounded-lg border border-brand-dark/10 bg-white p-2"
          >
            <h2
              id={`type-${type.id}`}
              className="flex items-center gap-2 px-2 pb-1 pt-2 text-base font-semibold text-brand-dark"
            >
              <span
                className={cn("h-2.5 w-2.5 rounded-full", categoryDotFor(type.id))}
                aria-hidden="true"
              />
              {type.name}
            </h2>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  {/* Fixed widths keep columns aligned across the type cards. */}
                  <TableHead className="w-2/5">Class</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="w-24 text-right">Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {type.classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <Link href={rosterHref(cls)} className={rowLinkClass}>
                        {cls.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {cls.slots.length === 0 ? (
                        <span className="text-sm text-brand-dark/60">
                          {period ? "Not scheduled this period" : "—"}
                        </span>
                      ) : (
                        <ul className="space-y-0.5 text-sm">
                          {cls.slots.map((slot) => (
                            <li key={slot.id}>{slotLabel(slot)}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{cls.enrolled}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Classes"
        actions={
          <Link
            href="/dashboard/classes/update"
            data-tour="classes-update"
            className={buttonVariants()}
          >
            Update classes
          </Link>
        }
      />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-dark/70">
            {period ? `Schedule and enrollments for ${period.name}.` : " "}
          </p>
          <PeriodPicker periods={periods} period={period} />
        </div>
        {body}
      </div>
    </>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Classes />
    </Suspense>
  );
}
