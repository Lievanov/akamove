"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import moment from "moment";
import { Ticket } from "lucide-react";
import { getPassSales, passStatus } from "@/api/punch_pass/punch_pass";
import { getTimezone } from "@/api/settings/settings";
import Loading from "@/app/components/Loading";
import { buttonVariants } from "@/app/components/ui/Button";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { RowMenu } from "@/app/components/ui/RowMenu";
import { ServerTableCard, rowLinkClass } from "@/app/components/ui/ServerTableCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { useServerTable } from "@/app/components/utils/useServerTable";
import { formatDate, formatMoney, getTodayInTimezone } from "@/app/components/utils/utils";

const STATUS_CHIP = {
  active: { label: "Active", tone: "success" },
  used_up: { label: "Used up", tone: "neutral" },
  expired: { label: "Expired", tone: "danger" },
};

const fetchPassSales = ({ from, to, search }) => getPassSales(from, to, search);

// Payments → Punch passes: every pass sold. A pass sale isn't a `payment`
// row, so it's listed here rather than with class and event payments.
function PunchPassSales() {
  const table = useServerTable({ fetchPage: fetchPassSales });
  const [today, setToday] = useState(() => moment().format("YYYY-MM-DD"));

  useEffect(() => {
    getTimezone().then((timezone) => setToday(getTodayInTimezone(timezone)));
  }, []);

  if (table.isLoading) return <Loading variant="table" />;
  if (table.isEmpty) {
    return (
      <EmptyState
        icon={Ticket}
        title="No punch passes sold yet"
        description="Sell a pass from a student's page, or from Record payment → Punch pass."
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
      noun={["pass", "passes"]}
      searchPlaceholder="Search by student name, phone number or pass"
      noMatchesHint="Try a student's name or a pass like “10-class”."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Pass</TableHead>
            <TableHead className="hidden sm:table-cell">Bought</TableHead>
            <TableHead className="hidden md:table-cell">Used</TableHead>
            <TableHead className="hidden md:table-cell">Method</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((pass) => {
            const fullName = [pass.student?.first_name, pass.student?.last_name]
              .filter(Boolean)
              .join(" ");
            const status = STATUS_CHIP[passStatus(pass, today)];
            return (
              <TableRow key={pass.id}>
                <TableCell>
                  <Link href={`/dashboard/students/${pass.student_id}`} className={rowLinkClass}>
                    {fullName || "Unnamed student"}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="mr-2">{pass.name}</span>
                  <Chip label={status.label} tone={status.tone} />
                  {pass.expires_on && (
                    <span className="block text-xs text-brand-dark/60">
                      Expires {formatDate(pass.expires_on)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap sm:table-cell">
                  {formatDate(pass.purchased_on)}
                </TableCell>
                <TableCell className="hidden tabular-nums md:table-cell">
                  {pass.entries?.length ?? 0} / {pass.total_entries}
                </TableCell>
                <TableCell className="hidden md:table-cell">{pass.payment_method ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-right font-medium">
                  {formatMoney(pass.price)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <RowMenu
                      label={`More actions for ${fullName || "student"}`}
                      items={[
                        { label: "View student", href: `/dashboard/students/${pass.student_id}` },
                        {
                          label: "Sell another pass",
                          href: `/dashboard/payments/${pass.student_id}?sell=punch-pass`,
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

export default PunchPassSales;
