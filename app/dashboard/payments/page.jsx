"use client";
import { useEffect, useState, useRef } from "react";
import { getPaymentCountFiltered, getPayments } from "@/api/payment/payment";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { Pencil } from "lucide-react";
import Loading from "@/app/components/Loading";
import { formatDate } from "@/app/components/utils/utils";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Input } from "@/app/components/ui/Input";
import { Pagination } from "@/app/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

function Payments() {
  const router = useRouter();
  const ITEMS_PER_PAGE = 10;

  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState({ text: "", severity: "" });

  const debouncedSearch = useRef(
    debounce(async (value) => {
      retrievePaymentList(value);
    }, 500)
  ).current;

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const text = urlSearchParams.get("text");
    const severity = urlSearchParams.get("severity");

    if (text && severity) setAlert({ text, severity });
  }, []);

  useEffect(() => {
    retrievePaymentList(searchTerm);
  }, [page]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm]);

  const retrievePaymentList = async (value) => {
    setPayments([]);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const paymentData = await getPayments(start, end, value ? value : "");
    setPayments(paymentData);
    const count = await getPaymentCountFiltered(value ? value : "");
    setTotalItems(count);
    setLoading(false);
  };

  const handleChange = (event) => {
    const { value } = event.target;
    setSearchTerm(value);
    handlePagination(1);
  };

  const handlePagination = (value) => {
    setPage(value);
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Payments" />
      <div className="mx-auto mb-8 max-w-5xl px-4">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="rounded-lg border border-brand-dark/10 p-2 mt-6">
          <div className="mb-4">
            <Input
              id="searchTerm"
              placeholder="Search by Name, Phone Number or Payment Method"
              value={searchTerm}
              onChange={handleChange}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Payment Amount</TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-medium text-brand-pink hover:underline"
                      onClick={() =>
                        router.push(`/dashboard/students/${row.student_id}`)
                      }
                    >
                      {row.first_name}
                    </button>
                  </TableCell>
                  <TableCell>{row.last_name}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>{row.payment_method}</TableCell>
                  <TableCell>{row.period_name}</TableCell>
                  <TableCell>
                    {row.payment_amount
                      ? `$${row.payment_amount.toFixed(2)}`
                      : "No payment"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/dashboard/payments/${row.student_id}`)
                      }
                    >
                      New Payment
                    </Button>
                  </TableCell>
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
                </TableRow>
              ))}
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
    </>
  );
}

export default Payments;
