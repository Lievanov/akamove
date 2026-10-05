"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { buttonVariants } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Layers } from "lucide-react";
import { getClassesCount } from "@/api/class/class";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import ClassesByStudentList from "@/app/components/lists/ClassesAndStudentTable";

function Classes() {
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [classCount, setClassCount] = useState(null);
  usePageTour(TOURS.classes, { ready: classCount !== null });

  useEffect(() => {
    getClassesCount().then((count) => setClassCount(count ?? 0));
  }, []);

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const text = urlSearchParams.get("text");
    const severity = urlSearchParams.get("severity");

    if (text && severity) setAlert({ text, severity });
  }, []);

  return (
    <>
      <PageHeader
        title="Classes"
        actions={
          <Link
            href="/dashboard/classes/update"
            data-tour="classes-update"
            className={buttonVariants()}
          >
            Update classes
          </Link>
        }
      />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        {classCount === 0 ? (
          <EmptyState
            icon={Layers}
            title="No classes yet"
            description="Create a class type (a track like Salsa) and its levels in order — Salsa 1, Salsa 2, and so on. Then schedule them in a period."
            action={
              <Link
                href="/dashboard/classes/update"
                className={buttonVariants()}
              >
                Create your first class
              </Link>
            }
          />
        ) : (
          <div data-tour="classes-table">
            <Suspense>
              <ClassesByStudentList />
            </Suspense>
          </div>
        )}
      </div>
    </>
  );
}

export default Classes;
