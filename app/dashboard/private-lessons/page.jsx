"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { Pencil } from "lucide-react";
import {
  getPrivateLessonCount,
  getPrivateLessons,
  getPrivateLessonLogs,
  setPrivateLessonActive,
} from "@/api/private_lesson/private_lesson";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
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
import UseClassDialog from "@/app/components/form/UseClassDialog";

const COLS = 10;

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-dark/20 border-t-brand-pink" />
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
      ? (lesson.amount / lesson.lessons_purchased).toFixed(2)
      : "—";

  return (
    <TableRow>
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
              <strong>Amount:</strong> ${Number(lesson.amount).toFixed(2)}
            </span>
            <span>
              <strong>Per Lesson:</strong> ${perLesson}
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
                        <TableCell>{dt.toLocaleDateString()}</TableCell>
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
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [dialogLesson, setDialogLesson] = useState(null);
  const [openLogsId, setOpenLogsId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { activeTenant, tenantsLoading } = useActiveTenant();

  const debouncedSearch = useRef(
    debounce((value) => {
      setPage(1);
      retrieveLessons(value);
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
    retrieveLessons();
  }, [page, accessChecked]);

  const retrieveLessons = async (search = searchTerm) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const data = await getPrivateLessons(start, end, search);
    setLessons(data || []);
    const count = await getPrivateLessonCount(search);
    setTotalItems(count);
    setLoading(false);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handlePagination = (value) => {
    setPage(value);
  };

  const handleUseClassSuccess = () => {
    setAlert({ text: "Lesson recorded successfully!", severity: "success" });
    retrieveLessons();
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
      retrieveLessons();
    } else {
      setAlert({
        text: "Failed to update private lesson status.",
        severity: "error",
      });
    }
  };

  if (loading || !accessChecked) return <Loading />;

  return (
    <>
      <PageHeader title="Private Lessons" />
      <div className="mx-auto mb-8 max-w-6xl px-4">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6 flex justify-between gap-2">
          <Button onClick={() => router.push("/dashboard/private-lessons/new")}>
            Add new Private Lesson
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/private-lessons/reports")}
          >
            Reports
          </Button>
        </div>
        <div className="rounded-lg border border-brand-dark/10 p-2">
          <div className="mb-4">
            <Input
              placeholder="Search by First Name, Last Name, or Instructor"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Lessons Used</TableHead>
                <TableHead>Lessons Purchased</TableHead>
                <TableHead>Date Purchased</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Per Lesson</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Edit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((row) => {
                const perLesson =
                  row.lessons_purchased > 0
                    ? (row.amount / row.lessons_purchased).toFixed(2)
                    : "—";
                const logsOpen = openLogsId === row.id;
                return (
                  <>
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.first_name ? (
                          <button
                            type="button"
                            className="font-medium text-brand-pink hover:underline"
                            onClick={() =>
                              router.push(`/dashboard/students/${row.student_id}`)
                            }
                          >
                            {row.first_name} {row.last_name}
                          </button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{row.instructor_name ?? "—"}</TableCell>
                      <TableCell>{row.lessons_used}</TableCell>
                      <TableCell>{row.lessons_purchased}</TableCell>
                      <TableCell>
                        {row.date_purchased
                          ? new Date(row.date_purchased).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>${Number(row.amount).toFixed(2)}</TableCell>
                      <TableCell>${perLesson}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.is_active ? "Active" : "Inactive"}
                          className={row.is_active ? "bg-green-600" : "bg-brand-dark/40"}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          aria-label="Edit private lesson"
                          onClick={() =>
                            router.push(`/dashboard/private-lessons/${row.id}`)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={row.lessons_used >= row.lessons_purchased}
                            onClick={() => setDialogLesson(row)}
                          >
                            Use Class
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleLogs(row.id)}
                          >
                            Logs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(row)}
                          >
                            {row.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <LogsRow key={`logs-${row.id}`} lesson={row} open={logsOpen} />
                  </>
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

      <UseClassDialog
        open={!!dialogLesson}
        lesson={dialogLesson}
        onClose={() => setDialogLesson(null)}
        onSuccess={handleUseClassSuccess}
      />
    </>
  );
}

export default PrivateLessons;
