"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StudentCountByPeriod from "@/app/components/charts/StudentCountByPeriod";
import { PageHeader } from "@/app/components/ui/PageHeader";
import ClassByPeriodPerStudentCount from "@/app/components/charts/ClassByPeriodPerStudentCount";
import Loading from "@/app/components/Loading";
import { getPeriodById } from "@/api/period/period";
import PeriodRevenueSummary from "@/app/components/charts/PeriodRevenueSummary";
import PrivateLessonsByPeriod from "@/app/components/charts/PrivateLessonsByPeriod";
import EventsByPeriod from "@/app/components/charts/EventsByPeriod";
import PunchPassesByPeriod from "@/app/components/charts/PunchPassesByPeriod";

function PeriodReport() {
  const { periodId } = useParams();

  const [period, setPeriod] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("classes");

  useEffect(() => {
    getPeriod();
  }, []);

  const getPeriod = async () => {
    setPeriod(await getPeriodById(periodId));
    setLoading(false);
  };

  if (loading) return <Loading />;
  return (
    <>
      <PageHeader title={`${period.name} report`} breadcrumbs={[{ label: "Periods", href: "/dashboard/periods" }]} />
      <div className="mx-auto max-w-6xl px-4 py-4 pb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-lg border border-brand-dark/10 bg-white p-4">
              <StudentCountByPeriod periodId={periodId} />
            </div>
            <div className="rounded-lg border border-brand-dark/10 bg-white p-4">
              <PeriodRevenueSummary
                periodId={periodId}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
          </div>
          <div className="rounded-lg border border-brand-dark/10 bg-white p-4 lg:col-span-8">
            {selectedCategory === "classes" && (
              <ClassByPeriodPerStudentCount periodId={periodId} />
            )}
            {selectedCategory === "private_lessons" && (
              <PrivateLessonsByPeriod
                startDate={period.start_date}
                endDate={period.end_date}
              />
            )}
            {selectedCategory === "events" && (
              <EventsByPeriod
                startDate={period.start_date}
                endDate={period.end_date}
              />
            )}
            {selectedCategory === "punch_passes" && (
              <PunchPassesByPeriod
                startDate={period.start_date}
                endDate={period.end_date}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default PeriodReport;
