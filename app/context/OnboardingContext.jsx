"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser } from "@/lib/supabase/client";
import { getToursSeen, saveToursSeen } from "@/api/profiles/profiles";
import { getSetupProgress } from "@/api/onboarding/setup";
import { saveChecklistDismissed } from "@/api/settings/settings";
import { useActiveTenant } from "./TenantContext";
import { Tour } from "@/app/components/ui/Tour";
import GlossaryDrawer from "@/app/components/onboarding/GlossaryDrawer";

// Everything that helps a new user find their way around the dashboard:
// the admin setup checklist, per-page guided tours, and the glossary.
// Mounted once in app/dashboard/layout.jsx.

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const pathname = usePathname();
  const { activeTenant } = useActiveTenant();
  const isAdmin = activeTenant?.role === "admin";

  const [userId, setUserId] = useState(null);
  // null until loaded (or if it can't be read) — tours only start on
  // their own once we know for sure the user hasn't seen them.
  const [toursSeen, setToursSeen] = useState(null);
  const [setup, setSetup] = useState(null);
  const [pageTour, setPageTour] = useState(null);
  const [activeTour, setActiveTour] = useState(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  // "Hide" folds the checklist down to its header. That's a per-viewer
  // convenience, so it lives in localStorage; closing it for good (X) is
  // the studio-wide `dismissed` flag in settings.
  const [checklistCollapsed, setChecklistCollapsedState] = useState(false);
  const collapsedKey = activeTenant?.id ? `setupChecklistCollapsed:${activeTenant.id}` : null;

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user?.id) return;
      setUserId(user.id);
      setToursSeen(await getToursSeen(user.id));
    };
    load();
  }, []);

  const refreshSetup = useCallback(async () => {
    if (!isAdmin || !activeTenant?.id) {
      setSetup(null);
      return;
    }
    const tenantId = activeTenant.id;
    const progress = await getSetupProgress(tenantId);
    setSetup({ ...progress, tenantId });
  }, [isAdmin, activeTenant?.id]);

  // Re-check on every navigation while setup is unfinished, so a step
  // ticks off as soon as the admin comes back from completing it.
  useEffect(() => {
    const finished =
      setup?.tenantId === activeTenant?.id && setup?.completed === setup?.total;
    if (!finished) refreshSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, refreshSetup]);

  useEffect(() => {
    if (!collapsedKey) return;
    try {
      setChecklistCollapsedState(localStorage.getItem(collapsedKey) === "true");
    } catch {}
  }, [collapsedKey]);

  const setChecklistCollapsed = (collapsed) => {
    setChecklistCollapsedState(collapsed);
    if (!collapsedKey) return;
    try {
      if (collapsed) localStorage.setItem(collapsedKey, "true");
      else localStorage.removeItem(collapsedKey);
    } catch {}
  };

  // A tour belongs to the page it started on (browser Back can still
  // navigate while the overlay is up). Closing this way doesn't mark it
  // seen, so it offers itself again next visit.
  useEffect(() => {
    setActiveTour(null);
  }, [pathname]);

  const setChecklistDismissed = async (dismissed) => {
    setSetup((prev) => (prev ? { ...prev, dismissed } : prev));
    await saveChecklistDismissed(dismissed);
  };

  // The ? menu's way back to a closed or folded checklist.
  const showChecklist = () => {
    setChecklistCollapsed(false);
    if (setup?.dismissed) setChecklistDismissed(false);
  };

  const markTourSeen = (tourId) => {
    if (!userId || toursSeen === null || toursSeen.includes(tourId)) return;
    const next = [...toursSeen, tourId];
    setToursSeen(next);
    saveToursSeen(userId, next);
  };

  const endTour = () => {
    if (activeTour) markTourSeen(activeTour.id);
    setActiveTour(null);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isAdmin,
        setup,
        refreshSetup,
        setChecklistDismissed,
        checklistCollapsed,
        setChecklistCollapsed,
        showChecklist,
        toursSeen,
        pageTour,
        setPageTour,
        activeTour,
        startTour: setActiveTour,
        openGlossary: () => setGlossaryOpen(true),
      }}
    >
      {children}
      <Tour open={!!activeTour} steps={activeTour?.steps ?? []} onClose={endTour} />
      <GlossaryDrawer open={glossaryOpen} onOpenChange={setGlossaryOpen} />
    </OnboardingContext.Provider>
  );
}

// null outside the dashboard (e.g. a PageHeader on a public page).
export const useOnboarding = () => useContext(OnboardingContext);

// Registers `tour` as this page's tour — the ? menu in PageHeader can
// replay it — and starts it on the user's first visit once `ready`
// (i.e. the page has loaded and its data-tour targets are rendered).
export function usePageTour(tour, { ready = true } = {}) {
  const onboarding = useOnboarding();
  const setPageTour = onboarding?.setPageTour;
  const startTour = onboarding?.startTour;
  const toursSeen = onboarding?.toursSeen;
  const tourRunning = !!onboarding?.activeTour;

  useEffect(() => {
    if (!setPageTour || !tour) return;
    setPageTour(tour);
    return () => setPageTour((current) => (current?.id === tour.id ? null : current));
  }, [setPageTour, tour]);

  useEffect(() => {
    if (!startTour || !tour || !ready || tourRunning) return;
    if (toursSeen === null || toursSeen === undefined || toursSeen.includes(tour.id)) return;
    // Give the page a beat to finish laying out before measuring targets.
    const timer = setTimeout(() => startTour(tour), 500);
    return () => clearTimeout(timer);
  }, [startTour, tour, ready, toursSeen, tourRunning]);
}
