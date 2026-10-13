"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentById, updateStudent } from "@/api/student/students";
import StudentForm from "@/app/components/form/StudentForm";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";
import { buttonVariants } from "@/app/components/ui/Button";
import ClassesByStudent from "@/app/components/lists/ClassesByStudent";
import PunchPassesByStudent from "@/app/components/lists/PunchPassesByStudent";

function ViewStudent() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useFlashAlert();
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
        title={`${student.first_name} ${student.last_name}`}
        breadcrumbs={[{ label: "Students", href: "/dashboard/students" }]}
        actions={
          <>
            <Link
              href={`/dashboard/students/${id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Update
            </Link>
            <Link
              href={`/dashboard/private-lessons/new?studentId=${id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Add private lesson
            </Link>
            <Link
              href={`/dashboard/payments/${id}`}
              className={buttonVariants()}
            >
              Record payment
            </Link>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StudentForm onSubmit={onSubmit} data={student} isReadOnly={true} />
        <div className="space-y-4">
          <PunchPassesByStudent
            studentId={id}
            studentName={student.first_name}
            onChange={setAlert}
          />
          <ClassesByStudent studentId={id} />
        </div>
      </div>
    </>
  );
}

export default ViewStudent;
