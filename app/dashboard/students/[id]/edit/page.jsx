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
      setAlert({ text: "Student updated successfully!", severity: "success" });
      router.push(
        `/dashboard/students?text=Student+successfully+updated!&severity=success`
      );
    } else
      setAlert({
        text: "Failed to update the student, please contact web admin!",
        severity: "error",
      });
  };

  if (loading) return <Loading />;
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
      />
      <StudentForm onSubmit={onSubmit} data={student} />
    </>
  );
}

export default EditStudent;
