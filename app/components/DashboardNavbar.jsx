"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { LogOut, FileText, MapPin, Building2 } from "lucide-react";
import Loading from "./Loading";
import supabase, { getUser } from "@/lib/supabase/client";
import { getPendingNotesCount } from "@/api/notes/notes";
import { getAllLocations } from "@/api/location/location";
import GlobalNotes from "./notes/GlobalNotes";
import { useSelectedLocation } from "@/app/context/LocationContext";
import { useActiveTenant } from "@/app/context/TenantContext";
import { Select } from "@/app/components/ui/Select";
import { Chip } from "@/app/components/ui/Chip";
import { cn } from "@/app/components/ui/utils/cn";

const ALL_TABS = [
  { label: "Main",            path: "/dashboard" },
  { label: "Students",        path: "/dashboard/students" },
  { label: "Classes",         path: "/dashboard/classes" },
  { label: "Payments",        path: "/dashboard/payments" },
  { label: "Events",          path: "/dashboard/events" },
  { label: "Periods",         path: "/dashboard/periods",          adminOnly: true, dividerBefore: true },
  { label: "Instructors",     path: "/dashboard/instructors",      adminOnly: true },
  { label: "Private Lessons", path: "/dashboard/private-lessons",  adminOnly: true },
  { label: "Locations",       path: "/dashboard/locations",        adminOnly: true },
  { label: "Settings",        path: "/dashboard/settings",         adminOnly: true },
  { label: "Notes",           path: "/dashboard/notes",            badgeKey: "pendingNotes" },
];

const DashboardNavbar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [pendingNotesCount, setPendingNotesCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const { selectedLocation, setSelectedLocation } = useSelectedLocation();
  const { activeTenant, setActiveTenant, availableTenants, tenantsLoading } =
    useActiveTenant();

  const role = activeTenant?.role ?? null;
  const isAdmin = role === "admin";

  useEffect(() => {
    callGetUser();
  }, []);

  const callGetUser = async () => {
    const user = await getUser();
    if (!user?.id) {
      router.push("/");
      return;
    }

    const [count, locs] = await Promise.all([
      getPendingNotesCount(),
      getAllLocations(),
    ]);
    setLocations(locs ?? []);
    setCurrentUser(user);
    setPendingNotesCount(count);
    setLoading(false);
  };

  const handleTenantChange = (tenantId) => {
    const tenant = availableTenants.find((t) => t.id === tenantId) ?? null;
    if (!tenant) return;
    setActiveTenant(tenant);
    // Role/data are tenant-scoped, so drop any already-rendered
    // tenant-specific state by landing back on the dashboard root.
    router.push("/dashboard");
    router.refresh();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const visibleTabs = useMemo(
    () => (isAdmin ? ALL_TABS : ALL_TABS.filter((t) => !t.adminOnly)),
    [isAdmin]
  );

  const badges = { pendingNotes: pendingNotesCount };

  if (loading || tenantsLoading) return <Loading />;

  return (
    <div className="flex h-screen w-[200px] shrink-0 flex-col border-r border-brand-dark/10 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-brand-dark/10 px-4 py-3">
        <Image src="/images/am_logo.png" width={28} height={28} alt="aka Move Logo" />
        <span className="text-sm font-semibold text-brand-dark">aka Move</span>
      </div>

      {/* Tenant switcher */}
      {availableTenants.length > 1 && (
        <div className="border-b border-brand-dark/10 px-3 py-3">
          <div className="mb-1.5 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-brand-dark/50" />
            <span className="text-xs font-semibold tracking-wide text-brand-dark/50">
              STUDIO
            </span>
          </div>
          <Select
            value={activeTenant?.id ?? ""}
            onChange={handleTenantChange}
            placeholder="Select studio…"
            options={availableTenants.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>
      )}

      {/* Location selector */}
      {locations.length > 0 && (
        <div className="border-b border-brand-dark/10 px-3 py-3">
          <div className="mb-1.5 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-brand-dark/50" />
            <span className="text-xs font-semibold tracking-wide text-brand-dark/50">
              LOCATION
            </span>
          </div>
          <Select
            value={selectedLocation?.id ?? ""}
            onChange={(value) => {
              const loc = locations.find((l) => l.id === value) ?? null;
              setSelectedLocation(loc);
            }}
            placeholder="Select location…"
            options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
          />
        </div>
      )}

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto pt-2">
        {visibleTabs.map((tab) => {
          const count = tab.badgeKey ? badges[tab.badgeKey] : 0;
          const isActive = pathname === tab.path;

          return (
            <div key={tab.path}>
              {tab.dividerBefore && (
                <div className="my-2 flex items-center gap-2 px-3">
                  <hr className="flex-1 border-brand-dark/10" />
                  <span className="text-xs text-brand-dark/40">Admin</span>
                  <hr className="flex-1 border-brand-dark/10" />
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push(tab.path)}
                className={cn(
                  "mx-1 mb-1 flex w-[calc(100%-8px)] items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                  isActive
                    ? "bg-brand-pink text-white"
                    : "text-brand-dark hover:bg-brand-dark/5"
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <Chip
                    label={count}
                    className={isActive ? "bg-white/20" : "bg-red-600"}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Note */}
      {currentUser && (
        <>
          <GlobalNotes
            currentUser={currentUser}
            open={addNoteOpen}
            onClose={() => setAddNoteOpen(false)}
          />
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => setAddNoteOpen(true)}
              className="flex w-full items-center gap-2 rounded-md border border-dashed border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <FileText className="h-4 w-4" />
              Add Note
            </button>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-brand-dark/10 p-3">
        {role && (
          <p className="mb-1 text-xs capitalize text-brand-dark/50">Role: {role}</p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-brand-dark/60 hover:bg-brand-dark/5"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default DashboardNavbar;
