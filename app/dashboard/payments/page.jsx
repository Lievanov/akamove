"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pencil, Users, Wallet } from "lucide-react";
import { getPaymentCountFiltered, getPayments } from "@/api/payment/payment";
import { getStudentCount } from "@/api/student/students";
import Loading from "@/app/components/Loading";
import { formatDate, formatMoney } from "@/app/components/utils/utils";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import { Toast } from "@/app/components/ui/Toast";
import { buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
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
import { useServerTable } from "@/app/components/utils/useServerTable";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/Tabs";
import ClassesByStudentList from "@/app/components/lists/ClassesAndStudentTable";
import PunchPassSales from "@/app/components/lists/PunchPassSales";

const fetchPayments = async ({ from, to, search }) => {
  const [rows, count] = await Promise.all([
    getPayments(from, to, search),
    getPaymentCountFiltered(search),
  ]);
  return { rows, count };
};

const TABS = ["payments", "enrollments", "punch-passes"];

// Class and event payments (the default tab).
function PaymentsTab() {
  const table = useServerTable({ fetchPage: fetchPayments });
  usePageTour(TOURS.payments, { ready: !table.isLoading });

  if (table.isLoading) return <Loading variant="table" />;
  if (table.isEmpty) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payments recorded yet"
        description="To record a payment, open Students and choose “Record payment” next to the student."
        action={
          <Link href="/dashboard/students" className={buttonVariants()}>
            Go to Students
          </Link>
        }
      />
    );
  }
  return (
      <ServerTableCard
        table={table}
        noun={["payment", "payments"]}
        searchPlaceholder="Search by name, phone number or payment method"
        noMatchesHint="Try a student's name, phone number, or a method like “cash”."
        searchTour="payments-search"
      >
        <Table data-tour="payments-table">
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell">Method</TableHead>
              <TableHead className="hidden md:table-cell">Period</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => {
              const fullName = [row.first_name, row.last_name]
                .filter(Boolean)
                .join(" ");
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/students/${row.student_id}`}
                      className={rowLinkClass}
                    >
                      {fullName || "Unnamed student"}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell className="hidden capitalize md:table-cell">
                    {row.payment_method ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.period_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    {formatMoney(row.payment_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/payments/edit/${row.id}`}
                        aria-label={`Update payment from ${fullName || "student"}`}
                        className={iconButtonClass}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <RowMenu
                        label={`More actions for ${fullName || "student"}`}
                        items={[
                          {
                            label: "Record new payment",
                            href: `/dashboard/payments/${row.student_id}`,
                          },
                          {
                            label: "Sell punch pass",
                            href: `/dashboard/payments/${row.student_id}?sell=punch-pass`,
                          },
                          {
                            label: "View student",
                            href: `/dashboard/students/${row.student_id}`,
                          },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ServerTableCard>
  );
}

function Payments() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [alert, setAlert] = useFlashAlert();
  const [studentCount, setStudentCount] = useState(null);
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "payments";

  useEffect(() => {
    getStudentCount().then((count) => setStudentCount(count ?? -1));
  }, []);

  // Each tab has its own search and page, so switching starts fresh.
  const onTabChange = (value) => {
    router.replace(value === "payments" ? pathname : `${pathname}?tab=${value}`, {
      scroll: false,
    });
  };

  return (
    <>
      <PageHeader title="Payments" />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        {studentCount === null ? (
          <Loading variant="table" />
        ) : studentCount === 0 ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Payments are recorded against students. Add your first student, then you can record their payments here."
            action={
              <Link
                href="/dashboard/students/new"
                className={buttonVariants()}
              >
                Add your first student
              </Link>
            }
          />
        ) : (
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
              <TabsTrigger value="punch-passes">Punch passes</TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="p-0">
              <PaymentsTab />
            </TabsContent>
            <TabsContent value="enrollments" className="p-0">
              <p className="mb-3 text-sm text-brand-dark/70">
                Who paid for which class, by period.
              </p>
              <ClassesByStudentList />
            </TabsContent>
            <TabsContent value="punch-passes" className="p-0">
              <PunchPassSales />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Payments />
    </Suspense>
  );
}
