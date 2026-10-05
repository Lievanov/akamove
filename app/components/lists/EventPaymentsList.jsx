import Loading from "../Loading";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEventPayments } from "@/api/events/event_payment";
import { formatDate } from "../utils/utils";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatMoney } from "@/app/components/utils/utils";

function EventPaymentsList({ eventId, eventName = "" }) {

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchEventPayments();
  }, []);

  const fetchEventPayments = async () => {
    const paymentList = await getEventPayments(eventId);
    setPayments(paymentList);
    setLoading(false);
  };

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = value.toString();
    if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const splitClientName = (name) => {
    const parts = name ? name.trim().split(/\s+/).filter(Boolean) : [];
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
    return { first, last };
  };

  const exportToCsv = () => {
    const headerRow = ["Last Name", "First Name"];
    const rows = payments.map((payment) => {
      const { first, last } = splitClientName(payment.client_name || "");
      return [escapeCsv(last), escapeCsv(first)];
    });

    const csvLines = [
      `Event Name,${escapeCsv(eventName || "Event")}`,
      "",
      headerRow.join(","),
      ...rows.map((cols) => cols.join(",")),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${(eventName || "event").toLowerCase().replace(/\\s+/g, "-")}-payments.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading variant="table" />;

  return (
    <div className="rounded-lg border border-brand-dark/10 bg-white p-6">
      <h2 className="text-xl font-semibold text-brand-dark">Event Payments</h2>
      <hr className="my-4 border-brand-dark/10" />
      <div className="mb-4 flex justify-between">
        <Link
          href={`/dashboard/events/${eventId}/payment`}
          className={buttonVariants()}
        >
          Record payment
        </Link>
        <Button variant="outline" onClick={exportToCsv}>
          Export CSV
        </Button>
      </div>
      {payments.length === 0 ? (
        <p className="py-8 text-center text-sm text-brand-dark/60">
          No payments found for this event.
        </p>
      ) : (
        <div className="rounded-lg border border-brand-dark/10 bg-white p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.client_name || "-"}</TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>
                    {formatMoney(payment.payment_amount ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-brand-dark/5 font-bold">
                <TableCell></TableCell>
                <TableCell>Total:</TableCell>
                <TableCell>
                  {formatMoney(payments.reduce((sum, payment) => sum + (payment.payment_amount || 0), 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default EventPaymentsList;
