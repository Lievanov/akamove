"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarClock, Users } from "lucide-react";

import { getAllClasses, getClassRoster } from "@/api/class/class";
import { getClassCatalog } from "@/api/class/class_schedule";
import { getPaymentAmountsForStudentsInPeriod } from "@/api/payment/payment";
import Loading from "@/app/components/Loading";
import { PeriodPicker, useSelectedPeriod } from "@/app/components/PeriodPicker";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Alert } from "@/app/components/ui/Alert";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { RowMenu } from "@/app/components/ui/RowMenu";
import { rowLinkClass } from "@/app/components/ui/ServerTableCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatMoney, formatPhoneNumber, formatTime } from "@/app/components/utils/utils";

// One class in one period: when and where it meets, and who paid for it.
function ClassRoster() {
  const { id } = useParams();
  const { periods, period } = useSelectedPeriod();
  const [cls, setCls] = useState(undefined);
  const [roster, setRoster] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (period === undefined) return;
    const load = async () => {
      setRoster(null);
      const [catalog, students] = await Promise.all([
        getClassCatalog(period?.id),
        period ? getClassRoster(id, period.id) : [],
      ]);
      const found = catalog?.flatMap((type) => type.classes).find((c) => c.id === id);
      // A class whose type was removed isn't in the catalog; still show it.
      setCls(found ?? (await getAllClasses())?.find((c) => c.id === id) ?? null);
      setLoadError(!catalog || !students);
      setRoster(students ?? []);
      if (students?.length && period) {
        setAmounts(await getPaymentAmountsForStudentsInPeriod(students.map((s) => s.id), period.id));
      }
    };
    load();
  }, [id, period]);

  if (cls === undefined || roster === null) return <Loading />;

  const title = cls?.label ?? "Class";
  const slots = cls?.slots ?? [];

  return (
    <>
      <PageHeader title={title} breadcrumbs={[{ label: "Classes", href: "/dashboard/classes" }]} />
      <div className="mx-auto mb-8 max-w-5xl space-y-4 px-4 pt-6">
        {!cls && <Alert severity="error">This class doesn&apos;t exist anymore.</Alert>}
        {loadError && (
          <Alert severity="error">
            Couldn&apos;t load this class. Check your connection and refresh.
          </Alert>
        )}
        <div className="flex justify-end">
          <PeriodPicker periods={periods} period={period} />
        </div>

        <section
          aria-labelledby="schedule-heading"
          className="rounded-lg border border-brand-dark/10 bg-white p-6"
        >
          <h2 id="schedule-heading" className="text-xl font-semibold text-brand-dark">
            Schedule
          </h2>
          {slots.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={CalendarClock}
              title="Not scheduled"
              description={
                period
                  ? `${title} isn't on ${period.name}'s schedule. Admins add it under Periods.`
                  : "Classes get a schedule once a period is created."
              }
            />
          ) : (
            <ul className="mt-3 divide-y divide-brand-dark/5">
              {slots.map((slot) => (
                <li key={slot.id} className="flex flex-wrap items-baseline gap-x-4 py-2 text-sm">
                  <span className="w-28 font-medium text-brand-dark">{slot.day_of_week}</span>
                  <span className="w-20 tabular-nums">{formatTime(slot.class_time)}</span>
                  <span className="text-brand-dark/70">{slot.location_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="students-heading"
          className="rounded-lg border border-brand-dark/10 bg-white p-6"
        >
          <h2 id="students-heading" className="text-xl font-semibold text-brand-dark">
            Students{roster.length > 0 && ` (${roster.length})`}
          </h2>
          {roster.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Users}
              title="No students yet"
              description={
                period
                  ? `Students show up here once they pay for ${title} in ${period.name}.`
                  : "Students show up here once they pay for this class in a period."
              }
            />
          ) : (
            <div className="mt-3 rounded-lg border border-brand-dark/10 p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Amount paid</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((student) => {
                    const fullName = [student.first_name, student.last_name]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Link href={`/dashboard/students/${student.id}`} className={rowLinkClass}>
                            {fullName || "Unnamed student"}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap sm:table-cell">
                          {student.phone ? formatPhoneNumber(student.phone) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                          {formatMoney(amounts[`${student.id}_${id}`])}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <RowMenu
                              label={`More actions for ${fullName || "student"}`}
                              items={[
                                { label: "View student", href: `/dashboard/students/${student.id}` },
                                { label: "Record payment", href: `/dashboard/payments/${student.id}` },
                              ]}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default function ClassRosterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClassRoster />
    </Suspense>
  );
}
