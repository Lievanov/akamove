"use client";
import { Suspense } from "react";
import Link from "next/link";
import { Pencil, UserRound } from "lucide-react";
import { getInstructors, getInstructorCount } from "@/api/instructor/instructor";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { EmptyState } from "@/app/components/ui/EmptyState";
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

const fetchInstructors = async ({ from, to }) => {
  const [rows, count] = await Promise.all([
    getInstructors(from, to),
    getInstructorCount(),
  ]);
  return { rows, count };
};

function Instructors() {
  const [alert, setAlert] = useFlashAlert();
  const table = useServerTable({ fetchPage: fetchInstructors });

  const addInstructorButton = (
    <Link href="/dashboard/instructors/new" className={buttonVariants()}>
      Add instructor
    </Link>
  );

  return (
    <>
      <PageHeader title="Instructors" actions={addInstructorButton} />
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
            icon={UserRound}
            title="No instructors yet"
            description="Add the people who teach your classes and private lessons, so you can assign them and see what they've taught."
            action={addInstructorButton}
          />
        ) : (
          <ServerTableCard table={table} noun={["instructor", "instructors"]}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/instructors/${row.id}`}
                        className={rowLinkClass}
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/instructors/${row.id}`}
                        aria-label={`Update ${row.name}`}
                        className={iconButtonClass}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ServerTableCard>
        )}
      </div>
    </>
  );
}

export default function InstructorsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Instructors />
    </Suspense>
  );
}
