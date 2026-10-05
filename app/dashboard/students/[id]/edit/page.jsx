"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentById, updateStudent } from "@/api/student/students";
import StudentForm from "@/app/components/form/StudentForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { useRouter } from "next/navigation";

function EditStudent() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [student, setStudent] = useState({});

  useEffect(() => {
    getStudent();
  }, []);

  const getStudent = async () => {
    setStudent(await getStudentById(id));
    setLoading(false);
  };

  const onSubmit = async (data) => {
    if (await updateStudent(data)) {
      setAlert({ text: "Student updated.", severity: "success" });
      router.push(
        `/dashboard/students?text=Student+updated.&severity=success`
      );
    } else
      setAlert({
        text: "Couldn't update the student. Check your connection and try again.",
        severity: "error",
      });
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
        title={`Update ${student.first_name} ${student.last_name}`}
        breadcrumbs={[
          { label: "Students", href: "/dashboard/students" },
          {
            label: `${student.first_name} ${student.last_name}`,
            href: `/dashboard/students/${id}`,
          },
        ]}
      />
      <StudentForm onSubmit={onSubmit} data={student} />
    </>
  );
}

export default EditStudent;
