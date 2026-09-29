"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUser } from "@/lib/supabase/client";
import { getUserTenants, acceptPendingInvites } from "@/api/tenant/tenant";

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [activeTenant, setActiveTenantState] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  const setActiveTenant = (tenant) => {
    setActiveTenantState(tenant);
    try {
      if (tenant) localStorage.setItem("activeTenant", JSON.stringify(tenant));
      else localStorage.removeItem("activeTenant");
    } catch {}
  };

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    const user = await getUser();
    if (!user?.id) {
      setAvailableTenants([]);
      setActiveTenant(null);
      setTenantsLoading(false);
      return;
    }

    let tenants = await getUserTenants(user.id);

    // Brand-new user, no memberships yet — attach them to any tenant
    // that has a pending invite for their email before falling through
    // to self-serve onboarding.
    if (tenants.length === 0) {
      const attached = await acceptPendingInvites();
      if (attached.length > 0) {
        tenants = await getUserTenants(user.id);
      }
    }

    setAvailableTenants(tenants);

    let stored = null;
    try {
      const raw = localStorage.getItem("activeTenant");
      if (raw) stored = JSON.parse(raw);
    } catch {}

    const storedStillValid = stored && tenants.some((t) => t.id === stored.id);
    const next = storedStillValid
      ? tenants.find((t) => t.id === stored.id)
      : (tenants[0] ?? null);

    setActiveTenant(next);
    setTenantsLoading(false);
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        setActiveTenant,
        availableTenants,
        tenantsLoading,
        refreshTenants: loadTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export const useActiveTenant = () => useContext(TenantContext);
