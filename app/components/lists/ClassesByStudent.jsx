"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import Loading from "../Loading";
import { getPaymentsByStudentId } from "@/api/payment/payment";
import { ClassChips } from "@/app/components/ui/ClassChips";
import { IconButton } from "@/app/components/ui/IconButton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatDate } from "@/app/components/utils/utils";

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

  if (loading) return <Loading />;

  return (
    <div className="rounded-lg border border-brand-dark/10 p-6">
      <h2 className="text-center text-xl font-semibold text-brand-dark">
        Classes By Period
      </h2>
      <div className="mt-4 rounded-lg border border-brand-dark/10 p-2">
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
                  <IconButton
                    aria-label="Edit payment"
                    onClick={() =>
                      router.push(`/dashboard/payments/edit/${row.id}`)
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
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
                <TableCell>${row.payment_amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ClassesByStudent;
