"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StudentForm from "@/app/components/form/StudentForm";
import { createStudent } from "@/api/student/students";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";

function NewStudent() {
  const router = useRouter();

  const [alert, setAlert] = useState({ text: "", severity: "" });

  const onSubmit = async (data) => {
    const student = await createStudent(data);
    if (student) {
      router.push(
        `/dashboard/payments/${student.id}?text=${student.first_name}+${student.last_name}+added.+Record+their+first+payment+below.&severity=success`
      );
    } else {
      setAlert({
        text: "Couldn't create the student. Check your connection and try again.",
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
      <PageHeader title="New student" breadcrumbs={[{ label: "Students", href: "/dashboard/students" }]} />

      <StudentForm onSubmit={onSubmit} />
    </>
  );
}

export default NewStudent;
