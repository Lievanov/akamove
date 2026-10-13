"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPeriod, getLatestPeriod } from "@/api/period/period";
import { getScheduleByPeriod, upsertScheduleForPeriod } from "@/api/period/period_location_class";
import { getAllClasses, buildNextClassMap } from "@/api/class/class";
import { getPeriodClassesMode, DEFAULT_PERIOD_CLASSES } from "@/api/settings/settings";
import PeriodForm from "@/app/components/form/PeriodForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";

function NewPeriod() {
  const router = useRouter();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [previousSchedule, setPreviousSchedule] = useState([]);
  const [previousPeriodName, setPreviousPeriodName] = useState(null);
  const [nextClassMap, setNextClassMap] = useState({});
  const [classesMode, setClassesMode] = useState(DEFAULT_PERIOD_CLASSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreviousSchedule = async () => {
      const latestPeriod = await getLatestPeriod();
      if (latestPeriod?.id) {
        const [schedule, classes, mode] = await Promise.all([
          getScheduleByPeriod(latestPeriod.id),
          getAllClasses(),
          getPeriodClassesMode(),
        ]);
        // The form either keeps these classes or advances each one to the
        // next in its class_type track (e.g. order 3 -> order 4), per `mode`.
        setPreviousSchedule(schedule ?? []);
        setNextClassMap(buildNextClassMap(classes ?? []));
        setClassesMode(mode);
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
        nextClassMap={nextClassMap}
        defaultClassesMode={classesMode}
      />
    </>
  );
}

export default NewPeriod;
