"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import ClassesByStudentList from "@/app/components/lists/ClassesAndStudentTable";

function Classes() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const text = urlSearchParams.get("text");
    const severity = urlSearchParams.get("severity");

    if (text && severity) setAlert({ text, severity });
  }, []);

  return (
    <>
      <PageHeader title="Classes" />
      <div className="mx-auto mb-8 max-w-5xl px-4">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6">
          <Button onClick={() => router.push("/dashboard/classes/update")}>
            Update Classes
          </Button>
        </div>
        <Suspense>
          <ClassesByStudentList />
        </Suspense>
      </div>
    </>
  );
}

export default Classes;
