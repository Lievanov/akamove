import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";
import { getTimezone } from "@/api/settings/settings";
import { getLatestPeriod, classByPeriodPerStudentCount } from "@/api/period/period";
import { getScheduleByPeriod } from "@/api/period/period_location_class";
import { getAllClasses } from "@/api/class/class";

// Data for the dashboard home ("today at the studio"). "Today" is always
// the studio's day (Settings → timezone), not the browser's.

export const getStudioToday = async () => {
  const timeZone = await getTimezone();
  const now = new Date();
  try {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
    }).format(now);
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
    return { date, weekday, label };
  } catch {
    const date = now.toISOString().split("T")[0];
    return {
      date,
      weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
      label: now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  }
};

// The period running today; falls back to the most recently created one
// (e.g. between sessions) so the home page still has something to show.
export const getCurrentPeriod = async (today) => {
  try {
    const { data, error } = await supabase
      .from("period")
      .select("*")
      .eq("tenant_id", getActiveTenantId())
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (data?.[0]) return { period: data[0], isRunning: true };
    const latest = await getLatestPeriod();
    return { period: latest ?? null, isRunning: false };
  } catch (error) {
    console.error("Error retrieving current period", error);
    return undefined;
  }
};

// Today's scheduled classes for a period, with how many students are
// enrolled in each. Returns [] when nothing is scheduled.
export const getTodaysClasses = async (periodId, weekday) => {
  const [schedule, classes, counts] = await Promise.all([
    getScheduleByPeriod(periodId),
    getAllClasses(),
    classByPeriodPerStudentCount(periodId),
  ]);
  const classById = new Map((classes ?? []).map((c) => [c.id, c]));
  const countByClass = new Map(
    (counts ?? []).map((row) => [row.class_id, row.student_count])
  );
  return (schedule ?? [])
    .filter((slot) => slot.day_of_week === weekday && slot.class_id)
    .map((slot) => {
      const cls = classById.get(slot.class_id);
      return {
        id: slot.id ?? `${slot.location_id}-${slot.class_id}-${slot.class_time}`,
        locationId: slot.location_id,
        time: slot.class_time,
        classId: slot.class_id,
        classType: cls?.class_type,
        label: cls?.label ?? "Class",
        enrolled: countByClass.get(slot.class_id) ?? 0,
      };
    })
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
};

// Active private-lesson blocks with one lesson (or none) left — the
// students to remind about buying another block.
export const getPrivateLessonsRunningLow = async () => {
  try {
    const { data, error } = await supabase
      .from("private_lessons_view")
      .select("*")
      .eq("is_active", true)
      .order("date_purchased", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? [])
      .map((row) => ({
        ...row,
        remaining: Math.max(
          (row.lessons_purchased ?? 0) - (row.lessons_used ?? 0),
          0
        ),
      }))
      .filter((row) => row.remaining <= 1)
      .sort((a, b) => a.remaining - b.remaining);
  } catch (error) {
    console.error("Error retrieving private lessons running low", error);
    return undefined;
  }
};
