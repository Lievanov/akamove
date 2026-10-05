import { getDefaultPrices, getChecklistDismissed } from "@/api/settings/settings";
import { getLocationCount } from "@/api/location/location";
import { getClassesCount } from "@/api/class/class";
import { getPeriodCount } from "@/api/period/period";
import { getInvites } from "@/api/tenant/invite";

// The studio-setup checklist, in the order the dashboard needs things:
// a period's pricing comes from Settings, its schedule is built per
// location, and each schedule slot picks a class. Every step is checked
// against real data, so it ticks itself off however the admin got there.
export const SETUP_STEPS = [
  {
    id: "settings",
    title: "Set your default class prices",
    description:
      "The price options students can pay for a period. Every new period starts with them.",
    href: "/dashboard/settings",
    action: "Open Settings",
  },
  {
    id: "locations",
    title: "Add your first location",
    description:
      "The studio space(s) where you teach. Each period gets its own schedule per location.",
    href: "/dashboard/locations/new",
    action: "Add location",
  },
  {
    id: "classes",
    title: "Create your classes and levels",
    description:
      "Make a class type (e.g. Salsa) and its levels in order: Salsa 1, Salsa 2, and so on.",
    href: "/dashboard/classes/update",
    action: "Set up classes",
  },
  {
    id: "periods",
    title: "Create your first period",
    description:
      "A period is one session of classes, like “May 2026”. Set its dates and build the weekly schedule.",
    href: "/dashboard/periods/new",
    action: "Create period",
  },
  {
    id: "team",
    title: "Invite your team",
    description: "Optional — add staff who take payments and check in students.",
    href: "/dashboard/settings/team",
    action: "Invite team",
    optional: true,
  },
];

export const getSetupProgress = async (tenantId) => {
  const [prices, locationCount, classCount, periodCount, invites, dismissed] =
    await Promise.all([
      getDefaultPrices(),
      getLocationCount(),
      getClassesCount(),
      getPeriodCount(),
      getInvites(tenantId),
      getChecklistDismissed(),
    ]);

  const done = {
    settings: prices.length > 0,
    locations: (locationCount ?? 0) > 0,
    classes: (classCount ?? 0) > 0,
    periods: (periodCount ?? 0) > 0,
    team: invites.some((invite) => invite.status !== "revoked"),
  };

  const steps = SETUP_STEPS.map((step) => ({ ...step, done: done[step.id] }));
  const completed = steps.filter((step) => step.done).length;

  return { steps, completed, total: steps.length, dismissed };
};
