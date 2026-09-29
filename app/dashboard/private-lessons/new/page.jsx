"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPrivateLesson } from "@/api/private_lesson/private_lesson";
import { getStudentById } from "@/api/student/students";
import PrivateLessonForm from "@/app/components/form/PrivateLessonForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";

function NewPrivateLesson() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [presetStudent, setPresetStudent] = useState(null);

  useEffect(() => {
    if (studentId) {
      getStudentById(studentId).then((student) => {
        if (student) setPresetStudent(student);
      });
    }
  }, [studentId]);

  const onSubmit = async (data) => {
    const success = await createPrivateLesson(data);
    if (success) {
      router.push(
        "/dashboard/students?text=Private+lesson+successfully+created!&severity=success"
      );
    } else {
      setAlert({
        text: "Failed to create private lesson, please contact web admin!",
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
          duration={5000}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader title="New Private Lesson" />
      <PrivateLessonForm
        onSubmit={onSubmit}
        presetStudent={presetStudent}
        backRouteTo={
          studentId ? `/dashboard/students/${studentId}` : undefined
        }
      />
    </>
  );
}

export default NewPrivateLesson;
