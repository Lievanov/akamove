"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import Loading from "../Loading";
import { getPaymentsByStudentId } from "@/api/payment/payment";
import { ClassChips } from "@/app/components/ui/ClassChips";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatDate, formatMoney } from "@/app/components/utils/utils";

function ClassesByStudent({ studentId }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPaymentsByStudentId();
  }, []);

  const fetchPaymentsByStudentId = async () => {
    const paymentList = await getPaymentsByStudentId(studentId);
    setPayments(paymentList);
    setLoading(false);
  };

  if (loading) return <Loading variant="table" />;

  return (
    <div className="rounded-lg border border-brand-dark/10 bg-white p-6">
      <h2 className="text-center text-xl font-semibold text-brand-dark">
        Classes By Period
      </h2>
      <div className="mt-4 rounded-lg border border-brand-dark/10 bg-white p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Classes</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/payments/edit/${row.id}`}
                    aria-label="Update payment"
                    className={iconButtonClass}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </TableCell>
                <TableCell>
                  <ClassChips
                    colorIds={row.class_type}
                    classes={row.class_info}
                    router={router}
                  />
                </TableCell>
                <TableCell>{formatDate(row.created_at)}</TableCell>
                <TableCell>{row.period_name}</TableCell>
                <TableCell>{formatMoney(row.payment_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ClassesByStudent;
