"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import PaymentForm from "@/app/components/form/PaymentForm";
import Loading from "@/app/components/Loading";
import { editPayment, getPaymentById } from "@/api/payment/payment";
import { getLatestPeriod } from "@/api/period/period";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getStudentById } from "@/api/student/students";
import ClassesByPayment from "@/app/components/lists/ClassesByPayment";

function EditPayment() {
  const router = useRouter();
  const { paymentId } = useParams();

  const [payment, setPayment] = useState({});
  const [period, setPeriod] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ text: "", severity: "" });

  useEffect(() => {
    getPayment();
  }, []);

  const getPayment = async () => {
    const payment = await getPaymentById(paymentId);
    const student = await getStudentById(payment.student_id);
    payment.student = student;
    setPayment(payment);
    setPeriod(await getLatestPeriod());

    setLoading(false);
  };

  const onSubmit = async (data) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      data.id = paymentId;
      if (await editPayment(data)) {
        router.push(
          `/dashboard/payments?text=Payment+updated.&severity=success`
        );
      } else {
        setAlert({
          text: "Couldn't update the payment. Check your connection and try again.",
          severity: "error",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading variant="form-page" />;

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
      <PageHeader
        title={`Update payment: ${payment.student.first_name} ${payment.student.last_name}`}
        breadcrumbs={[{ label: "Payments", href: "/dashboard/payments" }]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PaymentForm
            onSubmit={onSubmit}
            period={period}
            payment={payment}
            student={payment.student}
            isSubmitting={submitting}
          />
        </div>
        <div className="lg:col-span-5">
          <ClassesByPayment
            studentId={payment.student_id}
            currentPaymentId={paymentId}
          />
        </div>
      </div>
    </>
  );
}

export default EditPayment;
