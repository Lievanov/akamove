"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardNavbar from "../components/DashboardNavbar";
import Loading from "../components/Loading";
import LoadingScreen from "../components/LoadingScreen";
import { getProfileRole } from "@/api/profiles/profiles";
import supabase, { getUser } from "@/lib/supabase/client";
import { LocationProvider } from "../context/LocationContext";
import { TenantProvider, useActiveTenant } from "../context/TenantContext";
import { OnboardingProvider } from "../context/OnboardingContext";
import { canAccess } from "./access";

function LayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  // Who the user is (signed in, not a student) is checked once per visit.
  // Route access is then decided synchronously from the active tenant's
  // role, so moving between pages never blanks the screen.
  const [userChecked, setUserChecked] = useState(false);
  const { activeTenant, availableTenants, tenantsLoading } = useActiveTenant();

  useEffect(() => {
    let isActive = true;
    const checkUser = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.replace("/");
        return;
      }
      // Students only use the mobile app; the dashboard doesn't exist for them.
      const globalRole = await getProfileRole(user.id);
      if (globalRole === "student") {
        router.replace("/");
        return;
      }
      if (isActive) setUserChecked(true);
    };
    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/");
    });

    return () => {
      isActive = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  // Brand-new user with no tenant yet. TenantProvider already tried
  // attaching them via any pending invite for their email (see
  // TenantContext.loadTenants) — if they're still empty, send them to
  // self-serve onboarding.
  const needsOnboarding =
    userChecked && !tenantsLoading && availableTenants.length === 0;
  const allowed = canAccess(pathname, activeTenant?.role);

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding/create-tenant");
  }, [needsOnboarding, router]);

  useEffect(() => {
    if (userChecked && !tenantsLoading && activeTenant && !allowed) {
      router.replace("/dashboard/access-denied");
    }
  }, [userChecked, tenantsLoading, activeTenant, allowed, router]);

  // Stays on the full-page loader until the user and their tenant are
  // known, so someone about to be redirected never sees the shell flash by.
  if (!userChecked || tenantsLoading || !activeTenant) return <LoadingScreen />;

  return (
    <LocationProvider>
      <OnboardingProvider>
        <a
          href="#main-content"
          className="sr-only z-[80] rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-dark shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
        >
          Skip to content
        </a>
        <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
          <DashboardNavbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto bg-brand-cream/30 focus:outline-none"
          >
            {allowed ? children : <Loading />}
          </main>
        </div>
      </OnboardingProvider>
    </LocationProvider>
  );
}

function Layout({ children }) {
  return (
    <TenantProvider>
      <LayoutContent>{children}</LayoutContent>
    </TenantProvider>
  );
}

export default Layout;
