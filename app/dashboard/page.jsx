"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { useActiveTenant } from "@/app/context/TenantContext";
import SetupChecklist from "../components/onboarding/SetupChecklist";
import { usePageTour } from "../context/OnboardingContext";
import { TOURS } from "../components/onboarding/tours";
import { getStudioToday, getCurrentPeriod } from "@/api/dashboard/today";
import { getAllLocations } from "@/api/location/location";
import TodaysClasses from "../components/home/TodaysClasses";
import {
  RecentPayments,
  PendingNotes,
  UpcomingEvents,
  PrivateLessonsRunningLow,
  StudentsThisPeriod,
} from "../components/home/SideCards";
import { CardRowsSkeleton, HomeCard } from "../components/home/HomeCard";

// Dashboard home: what's happening at the studio today, for admins and
// staff alike. Admins also get setup progress and money/roster signals.
function Dashboard() {
  const { activeTenant } = useActiveTenant();
  const isAdmin = activeTenant?.role === "admin";
  const [today, setToday] = useState(null);
  const [current, setCurrent] = useState(null);
  const [locations, setLocations] = useState([]);

  // Admins get the setup checklist instead; staff get a quick tour of
  // the parts of the dashboard they use.
  usePageTour(isAdmin ? null : TOURS.staffWelcome, { ready: !!activeTenant });

  useEffect(() => {
    let active = true;
    (async () => {
      const day = await getStudioToday();
      const [periodInfo, locs] = await Promise.all([
        getCurrentPeriod(day.date),
        getAllLocations(),
      ]);
      if (!active) return;
      setToday(day);
      setCurrent(periodInfo ?? { period: null, isRunning: false });
      setLocations(locs ?? []);
    })();
    return () => {
      active = false;
    };
  }, [activeTenant?.id]);

  return (
    <>
      <PageHeader title={today ? `Today · ${today.label}` : "Today"} />
      <div className="mx-auto max-w-6xl px-4 py-6">
        {isAdmin && <SetupChecklist />}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {today && current ? (
              <TodaysClasses
                today={today}
                current={current}
                locations={locations}
                isAdmin={isAdmin}
              />
            ) : (
              <HomeCard title="Today's classes">
                <CardRowsSkeleton rows={4} />
              </HomeCard>
            )}
            <RecentPayments />
          </div>
          <div className="space-y-4">
            <PendingNotes />
            <UpcomingEvents isAdmin={isAdmin} />
            {isAdmin && <PrivateLessonsRunningLow />}
            {isAdmin && <StudentsThisPeriod />}
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
