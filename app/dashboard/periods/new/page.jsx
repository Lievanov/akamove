"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPeriod, getLatestPeriod } from "@/api/period/period";
import { getScheduleByPeriod, upsertScheduleForPeriod } from "@/api/period/period_location_class";
import { getAllClasses, buildNextClassMap } from "@/api/class/class";
import PeriodForm from "@/app/components/form/PeriodForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";

function NewPeriod() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [previousSchedule, setPreviousSchedule] = useState([]);
  const [previousPeriodName, setPreviousPeriodName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreviousSchedule = async () => {
      const latestPeriod = await getLatestPeriod();
      if (latestPeriod?.id) {
        const [schedule, classes] = await Promise.all([
          getScheduleByPeriod(latestPeriod.id),
          getAllClasses(),
        ]);
        // Advance each class to the next one in its class_type track, so the
        // new period picks up where students left off (e.g. order 3 -> order 4).
        const nextClassMap = buildNextClassMap(classes ?? []);
        const advanced = (schedule ?? []).map((row) => ({
          ...row,
          class_id: nextClassMap[row.class_id] ?? row.class_id,
        }));
        setPreviousSchedule(advanced);
        setPreviousPeriodName(latestPeriod.name);
      }
      setLoading(false);
    };
    loadPreviousSchedule();
  }, []);

  const onSubmit = async ({ schedule, ...periodData }) => {
    const periodId = await createPeriod(periodData);
    if (!periodId) {
      setAlert({
        text: "Couldn't create the period. Check your connection and try again.",
        severity: "error",
      });
      return;
    }
    await upsertScheduleForPeriod(periodId, schedule);
    router.push(
      `/dashboard/periods?text=Period+created.&severity=success`
    );
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
      <PageHeader title="New period" breadcrumbs={[{ label: "Periods", href: "/dashboard/periods" }]} />
      <PeriodForm
        onSubmit={onSubmit}
        existingSchedule={previousSchedule}
        copiedFrom={previousPeriodName}
      />
    </>
  );
}

export default NewPeriod;
