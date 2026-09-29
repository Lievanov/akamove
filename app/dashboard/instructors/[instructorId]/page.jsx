"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getInstructorById, updateInstructor } from "@/api/instructor/instructor";
import InstructorForm from "@/app/components/form/InstructorForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";

function UpdateInstructor() {
  const router = useRouter();
  const { instructorId } = useParams();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstructor = async () => {
      setInstructor(await getInstructorById(instructorId));
      setLoading(false);
    };
    fetchInstructor();
  }, []);

  const onSubmit = async (data) => {
    const success = await updateInstructor({ id: instructorId, ...data });
    if (success) {
      router.push(
        `/dashboard/instructors?text=Instructor+successfully+updated!&severity=success`
      );
    } else {
      setAlert({
        text: "Failed to update instructor, please contact web admin!",
        severity: "error",
      });
    }
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
      <PageHeader title="Update Instructor" />
      <InstructorForm onSubmit={onSubmit} instructor={instructor} />
    </>
  );
}

export default UpdateInstructor;
