"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPrivateLesson } from "@/api/private_lesson/private_lesson";
import { getStudentById } from "@/api/student/students";
import PrivateLessonForm from "@/app/components/form/PrivateLessonForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { useActiveTenant } from "@/app/context/TenantContext";

function NewPrivateLesson() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [presetStudent, setPresetStudent] = useState(null);
  const { activeTenant } = useActiveTenant();
  const isAdmin = activeTenant?.role === "admin";

  useEffect(() => {
    if (studentId) {
      getStudentById(studentId).then((student) => {
        if (student) setPresetStudent(student);
      });
    }
  }, [studentId]);

  // Staff can add private lessons but can't open the Private Lessons
  // roster, so they're sent (and linked) back to where they came from.
  const studentName = presetStudent
    ? `${presetStudent.first_name} ${presetStudent.last_name}`
    : null;
  const backTo = studentId
    ? `/dashboard/students/${studentId}`
    : isAdmin
      ? "/dashboard/private-lessons"
      : "/dashboard/students";
  const breadcrumbs = studentId
    ? [
        { label: "Students", href: "/dashboard/students" },
        { label: studentName ?? "Student", href: backTo },
      ]
    : isAdmin
      ? [{ label: "Private Lessons", href: "/dashboard/private-lessons" }]
      : [{ label: "Students", href: "/dashboard/students" }];

  const onSubmit = async (data) => {
    const success = await createPrivateLesson(data);
    if (success) {
      router.push(`${backTo}?text=Private+lesson+created.&severity=success`);
    } else {
      setAlert({
        text: "Couldn't create the private lesson. Check your connection and try again.",
        severity: "error",
      });
    }
  };

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader title="New private lesson" breadcrumbs={breadcrumbs} />
      <PrivateLessonForm
        onSubmit={onSubmit}
        presetStudent={presetStudent}
        backRouteTo={backTo}
      />
    </>
  );
}

export default function NewPrivateLessonPage() {
  return (
    <Suspense fallback={<Loading variant="form-page" />}>
      <NewPrivateLesson />
    </Suspense>
  );
}
