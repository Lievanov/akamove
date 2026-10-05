"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import PaymentForm from "@/app/components/form/PaymentForm";
import Loading from "@/app/components/Loading";
import { getStudentById, updateStudentCredit } from "@/api/student/students";
import { createPayment } from "@/api/payment/payment";
import { createEventPayment } from "@/api/events/event_payment";
import { getLatestPeriod } from "@/api/period/period";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";
import ClassesByPayment from "@/app/components/lists/ClassesByPayment";

function NewPayment() {
  const router = useRouter();
  const { studentId } = useParams();
  const [student, setStudent] = useState({});
  const [period, setPeriod] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useFlashAlert();

  useEffect(() => {
    getStudent();
  }, []);

  const getStudent = async () => {
    setPeriod(await getLatestPeriod());
    setStudent(await getStudentById(studentId));
    setLoading(false);
  };

  const onSubmit = async (data) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      if (data.is_event_payment) {
        const today = new Date().toISOString().split("T")[0];
        const clientName =
          data.client_name && data.client_name.trim().length > 0
            ? data.client_name.trim()
            : `${student.first_name || ""} ${student.last_name || ""}`.trim();

        const success = await createEventPayment({
          event_id: data.event_id,
          payment_date: today,
          payment_amount: parseFloat(data.payment_amount),
          client_name: clientName || "Unknown",
        });

        if (success) {
          // If the student applied credit toward the event, persist the new balance.
          if (
            student?.id &&
            data.credit !== undefined &&
            data.credit !== null &&
            data.credit !== ""
          ) {
            await updateStudentCredit(student.id, parseFloat(data.credit));
          }
          router.back();
          return;
        }
      } else {
        data.student_id = student.id;
        const success = await createPayment(data);

        if (success) {
          // Immediately disable further submissions
          setSubmitting(true); // Keep it true to prevent any further clicks
          router.push(
            `/dashboard/students?text=Payment+recorded+for+${student.first_name}+${student.last_name}.&severity=success`
          );
          return;
        }
      }

      setAlert({
        text: "Couldn't create the payment. Check your connection and try again.",
        severity: "error",
      });
      setSubmitting(false); // Allow retry on failure
    } catch (error) {
      console.error("Payment submission error:", error);
      setAlert({
        text: "Couldn't record the payment. Check your connection and try again.",
        severity: "error",
      });
      setSubmitting(false); // Allow retry on error
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
        title={`Record payment: ${student.first_name} ${student.last_name}`}
        breadcrumbs={[
          { label: "Students", href: "/dashboard/students" },
          {
            label: `${student.first_name} ${student.last_name}`,
            href: `/dashboard/students/${studentId}`,
          },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PaymentForm
            onSubmit={onSubmit}
            period={period}
            student={student}
            isSubmitting={submitting}
          />
        </div>
        <div className="lg:col-span-5">
          <ClassesByPayment studentId={studentId} />
        </div>
      </div>
    </>
  );
}

export default NewPayment;
