"use client";
import { Fragment, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Pencil } from "lucide-react";
import {
  getPrivateLessonCount,
  getPrivateLessons,
  getPrivateLessonLogs,
  setPrivateLessonActive,
} from "@/api/private_lesson/private_lesson";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { RowMenu } from "@/app/components/ui/RowMenu";
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
import UseClassDialog from "@/app/components/form/UseClassDialog";
import { formatDate, formatMoney } from "@/app/components/utils/utils";
import { useServerTable } from "@/app/components/utils/useServerTable";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";

const COLS = 7;

const fetchLessons = async ({ from, to, search }) => {
  const [rows, count] = await Promise.all([
    getPrivateLessons(from, to, search),
    getPrivateLessonCount(search),
  ]);
  return { rows, count };
};

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-dark/20 border-t-brand-pink motion-reduce:animate-none" role="status" aria-label="Loading history" />
  );
}

function LogsRow({ lesson, open }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    if (!open || logs !== null) return;
    getPrivateLessonLogs(lesson.id).then((data) => setLogs(data || []));
  }, [open]);

  if (!open) return null;

  const perLesson =
    lesson.lessons_purchased > 0
      ? formatMoney(lesson.amount / lesson.lessons_purchased)
      : "—";

  return (
    <TableRow id={`logs-${lesson.id}`}>
      <TableCell colSpan={COLS}>
        <div className="mx-4 my-2">
          <div className="mb-2 flex flex-wrap gap-4 text-sm text-brand-dark">
            <span>
              <strong>Student:</strong>{" "}
              {lesson.first_name ? `${lesson.first_name} ${lesson.last_name}` : "—"}
            </span>
            <span>
              <strong>Instructor:</strong> {lesson.instructor_name ?? "—"}
            </span>
            <span>
              <strong>Lessons:</strong> {lesson.lessons_used} / {lesson.lessons_purchased}
            </span>
            <span>
              <strong>Amount:</strong> {formatMoney(lesson.amount)}
            </span>
            <span>
              <strong>Per Lesson:</strong> {perLesson}
            </span>
          </div>

          <p className="mb-1 text-sm font-medium text-brand-dark">Class History</p>

          {logs === null ? (
            <Spinner />
          ) : logs.length === 0 ? (
            <p className="text-sm text-brand-dark/60">No classes used yet.</p>
          ) : (
            <div className="max-w-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Instructor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const dt = new Date(log.used_at);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(dt)}</TableCell>
                        <TableCell>
                          {dt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{log.instructor?.name ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function PrivateLessons() {
  const [alert, setAlert] = useFlashAlert();
  const [dialogLesson, setDialogLesson] = useState(null);
  const [openLogsId, setOpenLogsId] = useState(null);
  const table = useServerTable({ fetchPage: fetchLessons });

  const handleUseClassSuccess = () => {
    setAlert({ text: "Lesson recorded.", severity: "success" });
    table.refresh();
  };

  const toggleLogs = (id) => {
    setOpenLogsId((prev) => (prev === id ? null : id));
  };

  const handleToggleActive = async (row) => {
    const success = await setPrivateLessonActive(row.id, !row.is_active);
    if (success) {
      setAlert({
        text: `Private lesson marked ${!row.is_active ? "active" : "inactive"}.`,
        severity: "success",
      });
      table.refresh();
    } else {
      setAlert({
        text: "Couldn't update the private lesson's status. Check your connection and try again.",
        severity: "error",
      });
    }
  };

  const addLessonButton = (
    <Link href="/dashboard/private-lessons/new" className={buttonVariants()}>
      Add private lesson
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Private Lessons"
        actions={
          <>
            <Link
              href="/dashboard/private-lessons/reports"
              className={buttonVariants({ variant: "outline" })}
            >
              Reports
            </Link>
            {addLessonButton}
          </>
        }
      />
      <div className="mx-auto mb-8 max-w-6xl px-4 pt-6">
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
            icon={GraduationCap}
            title="No private lessons yet"
            description="Add a block of private lessons a student has bought. Each time they take one, record it here and the balance updates."
            action={addLessonButton}
          />
        ) : (
          <ServerTableCard
            table={table}
            noun={["private lesson", "private lessons"]}
            searchPlaceholder="Search by student or instructor"
            noMatchesHint="Try the student's first or last name, or the instructor's name."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Instructor</TableHead>
                  <TableHead>Lessons left</TableHead>
                  <TableHead className="hidden lg:table-cell">Purchased</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row) => {
                  const remaining = Math.max(
                    (row.lessons_purchased ?? 0) - (row.lessons_used ?? 0),
                    0
                  );
                  const perLesson =
                    row.lessons_purchased > 0
                      ? formatMoney(row.amount / row.lessons_purchased)
                      : null;
                  const logsOpen = openLogsId === row.id;
                  const fullName = row.first_name
                    ? `${row.first_name} ${row.last_name ?? ""}`.trim()
                    : null;
                  return (
                    <Fragment key={row.id}>
                      <TableRow>
                        <TableCell>
                          {fullName ? (
                            <Link
                              href={`/dashboard/students/${row.student_id}`}
                              className={rowLinkClass}
                            >
                              {fullName}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{row.instructor_name ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium">{remaining}</span>
                          <span className="text-brand-dark/60">
                            {" "}
                            of {row.lessons_purchased}
                          </span>
                          {row.is_active && remaining > 0 && remaining <= 1 && (
                            <Chip
                              label="Last one"
                              tone="warning"
                              className="ml-2 px-2 py-0.5"
                            />
                          )}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap lg:table-cell">
                          {formatDate(row.date_purchased)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-right sm:table-cell">
                          <span className="font-medium">
                            {formatMoney(row.amount)}
                          </span>
                          {perLesson && (
                            <span className="block text-xs text-brand-dark/60">
                              {perLesson} / lesson
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Chip
                            label={row.is_active ? "Active" : "Inactive"}
                            tone={row.is_active ? "success" : "neutral"}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!row.is_active || remaining === 0}
                              onClick={() => setDialogLesson(row)}
                            >
                              Record lesson
                            </Button>
                            <Link
                              href={`/dashboard/private-lessons/${row.id}`}
                              aria-label={`Update private lesson${fullName ? ` for ${fullName}` : ""}`}
                              className={iconButtonClass}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <RowMenu
                              items={[
                                {
                                  label: logsOpen ? "Hide history" : "Show history",
                                  onSelect: () => toggleLogs(row.id),
                                },
                                {
                                  label: row.is_active ? "Deactivate" : "Activate",
                                  onSelect: () => handleToggleActive(row),
                                },
                              ]}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                      <LogsRow lesson={row} open={logsOpen} />
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </ServerTableCard>
        )}
      </div>

      <UseClassDialog
        open={!!dialogLesson}
        lesson={dialogLesson}
        onClose={() => setDialogLesson(null)}
        onSuccess={handleUseClassSuccess}
      />
    </>
  );
}

export default function PrivateLessonsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PrivateLessons />
    </Suspense>
  );
}
