"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import * as RadixDialog from "@radix-ui/react-dialog";
import { LogOut, FilePlus2, MapPin, Building2, Menu, X } from "lucide-react";
import supabase, { getUser } from "@/lib/supabase/client";
import { getPendingNotesCount } from "@/api/notes/notes";
import { getAllLocations } from "@/api/location/location";
import GlobalNotes from "./notes/GlobalNotes";
import { NOTES_CHANGED_EVENT } from "./notes/notesEvents";
import TrialStatusButton from "./TrialStatusButton";
import { useSelectedLocation } from "@/app/context/LocationContext";
import { useActiveTenant } from "@/app/context/TenantContext";
import { Select } from "@/app/components/ui/Select";
import { Chip } from "@/app/components/ui/Chip";
import { cn } from "@/app/components/ui/utils/cn";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { useMediaQuery } from "@/app/components/utils/useMediaQuery";
import { canAccess, isInSection } from "@/app/dashboard/access";

const ALL_TABS = [
  { label: "Today",           path: "/dashboard" },
  { label: "Students",        path: "/dashboard/students" },
  { label: "Classes",         path: "/dashboard/classes" },
  { label: "Payments",        path: "/dashboard/payments" },
  { label: "Events",          path: "/dashboard/events" },
  { label: "Periods",         path: "/dashboard/periods",          dividerBefore: true },
  { label: "Instructors",     path: "/dashboard/instructors" },
  { label: "Private Lessons", path: "/dashboard/private-lessons" },
  { label: "Locations",       path: "/dashboard/locations" },
  { label: "Settings",        path: "/dashboard/settings" },
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
  // Below lg the sidebar becomes a top bar + slide-out menu.
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    callGetUser();
  }, []);

  useEffect(() => {
    const refreshBadge = () => getPendingNotesCount().then(setPendingNotesCount);
    window.addEventListener(NOTES_CHANGED_EVENT, refreshBadge);
    return () => window.removeEventListener(NOTES_CHANGED_EVENT, refreshBadge);
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

  // Same rules the layout enforces (app/dashboard/access.js), so the nav
  // never offers a link that would bounce to "access restricted".
  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => canAccess(t.path, role)),
    [role]
  );

  const badges = { pendingNotes: pendingNotesCount };

  if (loading || tenantsLoading) {
    return isDesktop ? (
      <div className="h-full w-[200px] shrink-0 border-r border-brand-dark/10 bg-white" />
    ) : (
      <div className="h-14 shrink-0 border-b border-brand-dark/10 bg-white" />
    );
  }

  const panel = (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-brand-dark/10 px-4 py-3">
        <Image src="/images/am_logo.png" width={28} height={28} alt="aka Move" />
        <span className="flex-1 text-sm font-semibold text-brand-dark">aka Move</span>
        {!isDesktop && (
          <RadixDialog.Close aria-label="Close menu" className={cn(iconButtonClass, "-mr-2")}>
            <X className="h-5 w-5" />
          </RadixDialog.Close>
        )}
      </div>

      <TrialStatusButton />

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
            aria-label="Studio"
            value={activeTenant?.id ?? ""}
            onChange={handleTenantChange}
            placeholder="Select studio…"
            options={availableTenants.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>
      )}

      {/* Location selector */}
      {locations.length > 0 && (
        <div data-tour="nav-location-picker" className="border-b border-brand-dark/10 px-3 py-3">
          <div className="mb-1.5 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-brand-dark/50" />
            <span className="text-xs font-semibold tracking-wide text-brand-dark/50">
              LOCATION
            </span>
          </div>
          <Select
            aria-label="Location"
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
      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto pt-2">
        {visibleTabs.map((tab) => {
          const count = tab.badgeKey ? badges[tab.badgeKey] : 0;
          const isActive = isInSection(pathname, tab.path);

          return (
            <div key={tab.path}>
              {tab.dividerBefore && (
                <div className="my-2 flex items-center gap-2 px-3">
                  <hr className="flex-1 border-brand-dark/10" />
                  <span className="text-xs text-brand-dark/40">Admin</span>
                  <hr className="flex-1 border-brand-dark/10" />
                </div>
              )}
              <Link
                href={tab.path}
                data-tour={`nav-${tab.path.split("/")[2] ?? "main"}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "mx-1 mb-1 flex w-[calc(100%-8px)] items-center justify-between rounded-md px-3 py-2 text-left text-sm touch:py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-1",
                  isActive
                    ? "bg-brand-pink-deep font-medium text-white"
                    : "text-brand-dark hover:bg-brand-dark/5"
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <Chip
                    label={
                      <>
                        {count}
                        <span className="sr-only"> pending</span>
                      </>
                    }
                    tone={isActive ? null : "accent"}
                    className={cn("px-2 py-0.5", isActive && "bg-white/25 text-white")}
                  />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Add Note */}
      {currentUser && (
        <>
          <div className="px-2 pb-2">
            <button
              type="button"
              data-tour="add-note"
              onClick={() => {
                setMenuOpen(false);
                setAddNoteOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md border border-brand-dark/15 px-3 py-2 text-sm font-medium touch:py-3 text-brand-dark hover:bg-brand-dark/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
            >
              <FilePlus2 className="h-4 w-4 text-brand-pink-deep" />
              Add note
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
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-brand-dark/70 touch:py-3 hover:bg-brand-dark/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </>
  );

  const noteDialog = currentUser && (
    <GlobalNotes
      currentUser={currentUser}
      open={addNoteOpen}
      onClose={() => setAddNoteOpen(false)}
    />
  );

  if (isDesktop) {
    return (
      <aside className="flex h-full w-[200px] shrink-0 flex-col border-r border-brand-dark/10 bg-white">
        {panel}
        {noteDialog}
      </aside>
    );
  }

  return (
    <RadixDialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-brand-dark/10 bg-white px-2">
        <RadixDialog.Trigger
          aria-label="Open menu"
          className={cn(iconButtonClass, "h-11 w-11")}
        >
          <Menu className="h-5 w-5" />
        </RadixDialog.Trigger>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
        >
          <Image src="/images/am_logo.png" width={28} height={28} alt="" />
          <span className="text-sm font-semibold text-brand-dark">aka Move</span>
        </Link>
        {selectedLocation && (
          <span className="ml-auto mr-2 flex min-w-0 items-center gap-1 text-xs text-brand-dark/60">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{selectedLocation.name}</span>
          </span>
        )}
      </div>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-brand-dark/40" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-white shadow-xl focus:outline-none"
        >
          <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
          {panel}
        </RadixDialog.Content>
      </RadixDialog.Portal>
      {noteDialog}
    </RadixDialog.Root>
  );
};

export default DashboardNavbar;
