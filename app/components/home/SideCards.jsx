"use client";
import { useEffect } from "react";
import Link from "next/link";
import { getPayments } from "@/api/payment/payment";
import { getNotes, getPendingNotesCount } from "@/api/notes/notes";
import { getUpcomingEvents } from "@/api/events/events";
import { getStudentCount } from "@/api/student/students";
import { getPrivateLessonsRunningLow } from "@/api/dashboard/today";
import { NOTES_CHANGED_EVENT } from "@/app/components/notes/notesEvents";
import ActiveInactiveStudents from "@/app/components/charts/ActiveInactiveStudents";
import { Chip } from "@/app/components/ui/Chip";
import { rowLinkClass } from "@/app/components/ui/ServerTableCard";
import {
  formatDate,
  formatDatestamp,
  formatMoney,
} from "@/app/components/utils/utils";
import {
  HomeCard,
  CardEmpty,
  CardError,
  CardRowsSkeleton,
  useCardData,
} from "./HomeCard";

const smallLinkClass =
  "rounded text-xs font-medium text-brand-pink-deep hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink";

function RecentPayments() {
  const { status, data, retry } = useCardData(() => getPayments(0, 4, ""));
  return (
    <HomeCard title="Recent payments" href="/dashboard/payments">
      {status === "loading" ? (
        <CardRowsSkeleton rows={4} />
      ) : status === "error" ? (
        <CardError onRetry={retry} />
      ) : data.length === 0 ? (
        <CardEmpty>
          No payments yet. Record one from a student&apos;s row in Students.
        </CardEmpty>
      ) : (
        <ul className="-my-2.5 divide-y divide-brand-dark/5">
          {data.map((row) => (
            <li key={row.id} className="flex items-center gap-4 py-2.5">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/students/${row.student_id}`}
                  className={`${rowLinkClass} text-sm`}
                >
                  {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                </Link>
                <p className="truncate text-xs text-brand-dark/60">
                  {formatDate(row.created_at)}
                  {row.payment_method && ` · ${row.payment_method}`}
                  {row.period_name && ` · ${row.period_name}`}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-brand-dark">
                {formatMoney(row.payment_amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}

function PendingNotes() {
  const { status, data, retry } = useCardData(async () => {
    const [notes, count] = await Promise.all([
      getNotes(0, 2),
      getPendingNotesCount(),
    ]);
    return notes === undefined ? undefined : { notes, count };
  });

  // Stay in sync when a note is added from the sidebar.
  useEffect(() => {
    window.addEventListener(NOTES_CHANGED_EVENT, retry);
    return () => window.removeEventListener(NOTES_CHANGED_EVENT, retry);
  }, [retry]);

  const count = data?.count ?? 0;
  return (
    <HomeCard
      title="Pending notes"
      subtitle={status === "ready" && count > 0 ? `${count} waiting` : undefined}
      href="/dashboard/notes"
      linkLabel="Open notes"
    >
      {status === "loading" ? (
        <CardRowsSkeleton rows={2} />
      ) : status === "error" ? (
        <CardError onRetry={retry} />
      ) : data.notes.length === 0 ? (
        <CardEmpty>All caught up — no pending notes.</CardEmpty>
      ) : (
        <ul className="-my-2 divide-y divide-brand-dark/5">
          {data.notes.map((note) => (
            <li key={note.id} className="py-2">
              <p className="line-clamp-2 text-sm text-brand-dark">{note.note}</p>
              <p className="mt-0.5 text-xs text-brand-dark/60">
                {note.created_by ? `${note.created_by} · ` : ""}
                {formatDatestamp(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}

function UpcomingEvents({ isAdmin }) {
  const { status, data, retry } = useCardData(async () => {
    const events = await getUpcomingEvents();
    return events === undefined ? undefined : events.slice(0, 3);
  });
  return (
    <HomeCard title="Upcoming events" href="/dashboard/events">
      {status === "loading" ? (
        <CardRowsSkeleton rows={2} />
      ) : status === "error" ? (
        <CardError onRetry={retry} />
      ) : data.length === 0 ? (
        <CardEmpty
          action={
            isAdmin && (
              <Link href="/dashboard/events/new" className={smallLinkClass}>
                Add an event
              </Link>
            )
          }
        >
          No upcoming events.
        </CardEmpty>
      ) : (
        <ul className="-my-2 divide-y divide-brand-dark/5">
          {data.map((event) => (
            <li key={event.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className={`${rowLinkClass} text-sm`}
                >
                  {event.event_name}
                </Link>
                <p className="text-xs text-brand-dark/60">
                  {formatDate(event.event_date)}
                </p>
              </div>
              <Link
                href={`/dashboard/events/${event.id}/payment`}
                className={smallLinkClass}
              >
                Record payment
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}

function PrivateLessonsRunningLow() {
  const { status, data, retry } = useCardData(getPrivateLessonsRunningLow);
  const shown = (data ?? []).slice(0, 4);
  return (
    <HomeCard
      title="Private lessons running low"
      subtitle="Students to remind about a new block"
      href="/dashboard/private-lessons"
    >
      {status === "loading" ? (
        <CardRowsSkeleton rows={2} />
      ) : status === "error" ? (
        <CardError onRetry={retry} />
      ) : shown.length === 0 ? (
        <CardEmpty>Every active block has at least 2 lessons left.</CardEmpty>
      ) : (
        <ul className="-my-2 divide-y divide-brand-dark/5">
          {shown.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/students/${row.student_id}`}
                  className={`${rowLinkClass} text-sm`}
                >
                  {[row.first_name, row.last_name].filter(Boolean).join(" ") ||
                    "Unnamed student"}
                </Link>
                {row.instructor_name && (
                  <p className="text-xs text-brand-dark/60">
                    with {row.instructor_name}
                  </p>
                )}
              </div>
              <Chip
                label={row.remaining === 0 ? "None left" : "1 left"}
                tone={row.remaining === 0 ? "danger" : "warning"}
                className="px-2 py-0.5"
              />
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}

function StudentsThisPeriod() {
  const { status, data, retry } = useCardData(getStudentCount);
  return (
    <HomeCard
      title="Students"
      subtitle="Active means enrolled in the current period"
      href="/dashboard/students"
    >
      {status === "error" ? (
        <CardError onRetry={retry} />
      ) : (
        <>
          <p className="mb-3 text-sm text-brand-dark/70">
            <span className="text-2xl font-semibold tabular-nums text-brand-dark">
              {status === "ready" ? data ?? 0 : "—"}
            </span>{" "}
            on the roster
          </p>
          <ActiveInactiveStudents />
        </>
      )}
    </HomeCard>
  );
}

export {
  RecentPayments,
  PendingNotes,
  UpcomingEvents,
  PrivateLessonsRunningLow,
  StudentsThisPeriod,
};
