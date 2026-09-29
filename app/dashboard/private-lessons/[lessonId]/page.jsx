"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getPrivateLessonById,
  getPrivateLessonLogs,
  updatePrivateLesson,
} from "@/api/private_lesson/private_lesson";
import PrivateLessonForm from "@/app/components/form/PrivateLessonForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

function UpdatePrivateLesson() {
  const router = useRouter();
  const { lessonId } = useParams();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [lesson, setLesson] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [lessonData, logsData] = await Promise.all([
        getPrivateLessonById(lessonId),
        getPrivateLessonLogs(lessonId),
      ]);
      setLesson(lessonData);
      setLogs(logsData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    const success = await updatePrivateLesson({ id: lessonId, ...data });
    if (success) {
      router.push(
        `/dashboard/private-lessons?text=Private+lesson+successfully+updated!&severity=success`
      );
    } else {
      setAlert({
        text: "Failed to update private lesson, please contact web admin!",
        severity: "error",
      });
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          duration={5000}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader title="Update Private Lesson" />
      <PrivateLessonForm onSubmit={onSubmit} lesson={lesson} />

      <div className="mx-auto max-w-2xl px-4 pb-8">
        <h2 className="mb-2 text-lg font-semibold text-brand-dark">
          Class History
        </h2>
        <div className="rounded-lg border border-brand-dark/10 p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Instructor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <p className="py-2 text-center text-sm text-brand-dark/60">
                      No classes used yet.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
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
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

export default UpdatePrivateLesson;
