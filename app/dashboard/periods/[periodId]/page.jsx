"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPeriodById, updatePeriod } from "@/api/period/period";
import { getScheduleByPeriod, upsertScheduleForPeriod } from "@/api/period/period_location_class";
import PeriodForm from "@/app/components/form/PeriodForm";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Loading from "@/app/components/Loading";
import StudentCountByPeriod from "@/app/components/charts/StudentCountByPeriod";
import ClassByPeriodPerStudentCount from "@/app/components/charts/ClassByPeriodPerStudentCount";

function UpdatePeriod() {
  const router = useRouter();
  const { periodId } = useParams();

  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [period, setPeriod] = useState({});
  const [existingSchedule, setExistingSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, schedule] = await Promise.all([
        getPeriodById(periodId),
        getScheduleByPeriod(periodId),
      ]);
      setPeriod(p);
      setExistingSchedule(schedule);
      setLoading(false);
    };
    load();
  }, []);

  const onSubmit = async ({ schedule, ...periodData }) => {
    periodData.id = periodId;
    const [updated, scheduleUpdated] = await Promise.all([
      updatePeriod(periodData),
      upsertScheduleForPeriod(periodId, schedule),
    ]);

    if (updated && scheduleUpdated) {
      router.push(
        `/dashboard/periods?text=Period+updated.&severity=success`
      );
    } else {
      setAlert({
        text: "Couldn't update the period. Check your connection and try again.",
        severity: "error",
      });
    }
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
      <PageHeader title="Update period" breadcrumbs={[{ label: "Periods", href: "/dashboard/periods" }]} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PeriodForm
            onSubmit={onSubmit}
            period={period}
            existingSchedule={existingSchedule}
          />
        </div>
        <div className="flex flex-col gap-4 pt-6 lg:col-span-5">
          <div className="rounded-lg border border-brand-dark/10 bg-white p-4">
            <StudentCountByPeriod periodId={periodId} />
          </div>
          <ClassByPeriodPerStudentCount periodId={periodId} />
        </div>
      </div>
    </>
  );
}

export default UpdatePeriod;
