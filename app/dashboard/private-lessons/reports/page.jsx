"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Loading from "@/app/components/Loading";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import { Chip } from "@/app/components/ui/Chip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { getPrivateLessonLogsReport } from "@/api/private_lesson/private_lesson";
import { getStudioFee } from "@/api/settings/settings";
import { getAllInstructors } from "@/api/instructor/instructor";
import { getUser } from "@/lib/supabase/client";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { useActiveTenant } from "@/app/context/TenantContext";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildYears() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1];
}

export default function PrivateLessonReports() {
  const router = useRouter();
  const now = new Date();

  const [accessChecked, setAccessChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [studioFee, setStudioFee] = useState(0);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [instructorId, setInstructorId] = useState("all");
  const { activeTenant, tenantsLoading } = useActiveTenant();

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) { router.push("/dashboard/access-denined"); return; }
      if (tenantsLoading) return;
      const role = await getUserRoleForTenant(user.id, activeTenant?.id);
      if (role !== "admin") { router.push("/dashboard/access-denined"); return; }
      setAccessChecked(true);
    };
    checkAccess();
  }, [router, activeTenant?.id, tenantsLoading]);

  useEffect(() => {
    if (!accessChecked) return;
    getAllInstructors().then((data) => setInstructors(data || []));
    getStudioFee().then((fee) => setStudioFee(fee || 0));
  }, [accessChecked]);

  useEffect(() => {
    if (!accessChecked) return;
    fetchReport();
  }, [month, year, instructorId, accessChecked]);

  const fetchReport = async () => {
    setLoading(true);
    const data = await getPrivateLessonLogsReport(
      year,
      month,
      instructorId !== "all" ? instructorId : null
    );
    setLogs(data);
    setLoading(false);
  };

  // Group logs by instructor for the summary
  const summary = logs.reduce((acc, log) => {
    const name = log.instructor?.name ?? "Unknown";
    const id = log.instructor?.id ?? "unknown";
    const amount = log.private_lesson?.amount ?? 0;
    const purchased = log.private_lesson?.lessons_purchased ?? 0;
    const perLesson = purchased > 0 ? amount / purchased : 0;
    const netPerLesson = Math.max(perLesson - studioFee, 0);
    if (!acc[id])
      acc[id] = { name, count: 0, totalGross: 0, totalFees: 0, totalPay: 0 };
    acc[id].count += 1;
    acc[id].totalGross += perLesson;
    acc[id].totalFees += studioFee;
    acc[id].totalPay += netPerLesson;
    return acc;
  }, {});

  const summaryRows = Object.values(summary).sort((a, b) => b.count - a.count);
  const grandTotalGross = summaryRows.reduce((sum, r) => sum + r.totalGross, 0);
  const grandTotalFees = summaryRows.reduce((sum, r) => sum + r.totalFees, 0);
  const grandTotalPay = summaryRows.reduce((sum, r) => sum + r.totalPay, 0);

  if (!accessChecked || loading) return <Loading />;

  return (
    <>
      <PageHeader title="Private Lesson Reports" />
      <div className="mx-auto mb-8 max-w-5xl px-4">
        <div className="my-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push("/dashboard/private-lessons")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Private Lessons
          </Button>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-brand-dark/10 p-4">
            <div className="w-40">
              <Select
                label="Month"
                value={month}
                onChange={(v) => setMonth(Number(v))}
                options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
              />
            </div>
            <div className="w-28">
              <Select
                label="Year"
                value={year}
                onChange={(v) => setYear(Number(v))}
                options={buildYears().map((y) => ({ value: y, label: String(y) }))}
              />
            </div>
            <div className="w-52">
              <Select
                label="Instructor"
                value={instructorId}
                onChange={setInstructorId}
                options={[
                  { value: "all", label: "All Instructors" },
                  ...instructors.map((ins) => ({ value: ins.id, label: ins.name })),
                ]}
              />
            </div>
          </div>

          {/* Summary */}
          <h2 className="mb-2 text-lg font-semibold text-brand-dark">
            Summary — {MONTHS[month - 1]} {year}
          </h2>
          <div className="mb-6 rounded-lg border border-brand-dark/10">
            {summaryRows.length === 0 ? (
              <p className="p-4 text-sm text-brand-dark/60">
                No classes recorded for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Classes Done</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Studio Fees</TableHead>
                    <TableHead>Amount to Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Chip label={row.count} className="bg-brand-pink" />
                      </TableCell>
                      <TableCell>${row.totalGross.toFixed(2)}</TableCell>
                      <TableCell>-${row.totalFees.toFixed(2)}</TableCell>
                      <TableCell>${row.totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell>{logs.length}</TableCell>
                    <TableCell>${grandTotalGross.toFixed(2)}</TableCell>
                    <TableCell>-${grandTotalFees.toFixed(2)}</TableCell>
                    <TableCell>${grandTotalPay.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>

          <hr className="mb-6 border-brand-dark/10" />

          {/* Detail log */}
          <h2 className="mb-2 text-lg font-semibold text-brand-dark">Class Log</h2>
          <div className="rounded-lg border border-brand-dark/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Cost per Class</TableHead>
                  <TableHead>Studio Fee</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <p className="py-2 text-center text-sm text-brand-dark/60">
                        No logs found for this period.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const dt = new Date(log.used_at);
                    const student = log.private_lesson?.student;
                    const amount = log.private_lesson?.amount ?? 0;
                    const purchased = log.private_lesson?.lessons_purchased ?? 0;
                    const costPerClass = purchased > 0 ? amount / purchased : 0;
                    const netPay = Math.max(costPerClass - studioFee, 0);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {student
                            ? `${student.first_name} ${student.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell>{log.instructor?.name ?? "—"}</TableCell>
                        <TableCell>{dt.toLocaleDateString()}</TableCell>
                        <TableCell>
                          {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>${amount.toFixed(2)}</TableCell>
                        <TableCell>${costPerClass.toFixed(2)}</TableCell>
                        <TableCell>-${studioFee.toFixed(2)}</TableCell>
                        <TableCell>${netPay.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
