"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardNavbar from "../components/DashboardNavbar";
import Loading from "../components/Loading";
import { getProfileRole } from "@/api/profiles/profiles";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { LocationProvider } from "../context/LocationContext";
import { TenantProvider, useActiveTenant } from "../context/TenantContext";
import styles from "./styles.module.css";

function LayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { activeTenant, availableTenants, tenantsLoading } = useActiveTenant();

  useEffect(() => {
    let isActive = true;
    const accessRules = [
      { segment: "/events", roles: ["admin", "staff"] },
      { segment: "/periods", roles: ["admin"] },
      { segment: "/instructors", roles: ["admin"] },
      { segment: "/private-lessons/new", roles: ["admin", "staff"] },
      { segment: "/private-lessons", roles: ["admin"] },
      { segment: "/locations", roles: ["admin"] },
    ];
    const matchedRule = accessRules.find((rule) =>
      pathname.includes(rule.segment)
    );

    const checkAccess = async () => {
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

      // Wait for TenantProvider to finish resolving the user's tenants
      // before deciding access — role is now per-tenant, not global.
      if (tenantsLoading) return;

      // Brand-new user with no tenant yet. TenantProvider already tried
      // attaching them via any pending invite for their email before
      // this ran (see TenantContext.loadTenants) — if they're still
      // empty here, send them to self-serve onboarding.
      if (availableTenants.length === 0) {
        router.replace("/onboarding/create-tenant");
        return;
      }

      const role = await getUserRoleForTenant(user.id, activeTenant?.id);

      if (matchedRule && !matchedRule.roles.includes(role)) {
        router.replace("/dashboard/access-denined");
        return;
      }

      if (isActive) setCheckingAccess(false);
    };

    setCheckingAccess(true);
    checkAccess();

    return () => {
      isActive = false;
    };
  }, [pathname, router, activeTenant?.id, tenantsLoading, availableTenants.length]);

  return (
    <LocationProvider>
      <div className={styles.container}>
        <DashboardNavbar />
        <div className={styles.maincontent}>
          {checkingAccess ? <Loading /> : children}
        </div>
      </div>
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
