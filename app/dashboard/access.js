// Which tenant roles may open which dashboard sections. The dashboard
// layout enforces this once per navigation, and DashboardNavbar uses it to
// hide links the current role can't open — pages don't re-check.
// More specific prefixes must come before the section they live under.
const ROUTE_ACCESS = [
  { prefix: "/dashboard/private-lessons/new", roles: ["admin", "staff"] },
  { prefix: "/dashboard/private-lessons", roles: ["admin"] },
  { prefix: "/dashboard/periods", roles: ["admin"] },
  { prefix: "/dashboard/instructors", roles: ["admin"] },
  { prefix: "/dashboard/locations", roles: ["admin"] },
  { prefix: "/dashboard/settings", roles: ["admin"] },
  { prefix: "/dashboard/events", roles: ["admin", "staff"] },
];

const matchesPrefix = (pathname, prefix) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function canAccess(pathname, role) {
  const rule = ROUTE_ACCESS.find((r) => matchesPrefix(pathname, r.prefix));
  return !rule || rule.roles.includes(role);
}

// Starter has no team roles (see pricing): only admins can use the
// dashboard. Staff on a Starter studio see a "talk to your admin" screen
// instead (StaffAccessBlocked) — this includes studios whose trial ended.
export function planAllowsRole(plan, role) {
  return !(plan === "starter" && role !== "admin");
}

// True when `pathname` is `section` or a page nested under it, so the
// sidebar keeps a section highlighted on its detail and edit pages.
export function isInSection(pathname, section) {
  if (section === "/dashboard") return pathname === "/dashboard";
  return matchesPrefix(pathname, section);
}
