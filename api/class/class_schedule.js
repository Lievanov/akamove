import { getAllClasses } from "./class";
import { getClassTypeList } from "./class_type";
import { getScheduleByPeriod } from "../period/period_location_class";
import { getAllLocations } from "../location/location";
import { classByPeriodPerStudentCount } from "../period/period";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Weekly order: Monday first, then by time.
const bySlotOrder = (a, b) =>
  DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week) ||
  String(a.class_time).localeCompare(String(b.class_time));

// Every class with its type, its weekly slots in `periodId` (day, time,
// location) and how many students paid for it in that period. Without a
// period, classes come back with no slots and no enrollments.
// Resolves to undefined when a required lookup fails.
export const getClassCatalog = async (periodId) => {
  const [classes, types, schedule, locations, counts] = await Promise.all([
    getAllClasses(),
    getClassTypeList(),
    periodId ? getScheduleByPeriod(periodId) : [],
    getAllLocations(),
    periodId ? classByPeriodPerStudentCount(periodId) : [],
  ]);
  if (!classes || !types) return undefined;

  const locationName = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const countByClass = new Map((counts ?? []).map((r) => [r.class_id, r.student_count]));
  const slotsByClass = new Map();
  for (const slot of (schedule ?? []).filter((s) => s.class_id).sort(bySlotOrder)) {
    const slots = slotsByClass.get(slot.class_id) ?? [];
    slots.push({ ...slot, location_name: locationName.get(slot.location_id) ?? "—" });
    slotsByClass.set(slot.class_id, slots);
  }

  const withDetails = classes.map((cls) => ({
    ...cls,
    slots: slotsByClass.get(cls.id) ?? [],
    enrolled: countByClass.get(cls.id) ?? 0,
  }));

  // Grouped by class type (A–Z), levels in their set order.
  return [...types]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((type) => ({
      ...type,
      classes: withDetails
        .filter((cls) => cls.class_type === type.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.level ?? 0) - (b.level ?? 0)),
    }))
    .filter((type) => type.classes.length > 0);
};
