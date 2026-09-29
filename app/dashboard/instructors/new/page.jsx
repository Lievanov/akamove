"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createInstructor } from "@/api/instructor/instructor";
import InstructorForm from "@/app/components/form/InstructorForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";

function NewInstructor() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });

  const onSubmit = async (data) => {
    const success = await createInstructor(data);
    if (success) {
      router.push(
        `/dashboard/instructors?text=Instructor+successfully+created!&severity=success`
      );
    } else {
      setAlert({
        text: "Failed to create instructor, please contact web admin!",
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
      <PageHeader title="New Instructor" />
      <InstructorForm onSubmit={onSubmit} />
    </>
  );
}

export default NewInstructor;
