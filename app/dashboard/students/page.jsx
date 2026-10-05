"use client";
import { Suspense } from "react";
import Link from "next/link";
import { Pencil, Users } from "lucide-react";
import {
  getStudentsBylastPayment,
  getStudentCountFiltered,
} from "@/api/student/students";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import { buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { ClassChips } from "@/app/components/ui/ClassChips";
import { EmptyState } from "@/app/components/ui/EmptyState";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatPhoneNumber } from "@/app/components/utils/utils";
import { useServerTable } from "@/app/components/utils/useServerTable";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";
import { ServerTableCard, rowLinkClass } from "@/app/components/ui/ServerTableCard";

const fetchStudents = async ({ from, to, search }) => {
  const [rows, count] = await Promise.all([
    getStudentsBylastPayment(from, to, search),
    getStudentCountFiltered(search),
  ]);
  return { rows, count };
};

// The view repeats a class once per payment; show each class once.
const getUniqueClassesForRow = (row) => {
  const classNames = row?.class_info;
  const classTypes = row?.class_type;

  if (
    !Array.isArray(classNames) ||
    !Array.isArray(classTypes) ||
    classNames.length !== classTypes.length
  ) {
    return { class_info: classNames, class_type: classTypes };
  }

  const seen = new Set();
  const uniqueNames = [];
  const uniqueTypes = [];

  for (let i = 0; i < classNames.length; i += 1) {
    const name = classNames[i];
    if (!name) continue;
    const key = String(name).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueNames.push(name);
    uniqueTypes.push(classTypes[i]);
  }

  return { class_info: uniqueNames, class_type: uniqueTypes };
};

function Students() {
  const [alert, setAlert] = useFlashAlert();
  const table = useServerTable({ fetchPage: fetchStudents });
  usePageTour(TOURS.students, { ready: !table.isLoading });

  const addStudentButton = (
    <Link
      href="/dashboard/students/new"
      data-tour="students-add"
      className={buttonVariants()}
    >
      Add student
    </Link>
  );

  return (
    <>
      <PageHeader title="Students" actions={addStudentButton} />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}

        {table.isLoading ? (
          <Loading variant="table" />
        ) : table.isEmpty ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Add your first student to start recording payments and enrolling them in classes."
            action={addStudentButton}
          />
        ) : (
          <ServerTableCard
            table={table}
            noun={["student", "students"]}
            searchPlaceholder="Search by name or phone number"
            noMatchesHint="Check the spelling, or search by phone number instead."
            searchTour="students-search"
          >
          <Table data-tour="students-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Current classes</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row) => {
                const unique = getUniqueClassesForRow(row);
                const fullName = [row.first_name, row.last_name]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/students/${row.id}`}
                        className={rowLinkClass}
                      >
                        {fullName || "Unnamed student"}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatPhoneNumber(row.phone) || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ClassChips
                        colorIds={unique.class_type}
                        classes={unique.class_info}
                          />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/payments/${row.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          Record payment
                        </Link>
                        <Link
                          href={`/dashboard/students/${row.id}/edit`}
                          aria-label={`Update ${fullName || "student"}`}
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

export { Students };
export default function StudentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Students />
    </Suspense>
  );
}
