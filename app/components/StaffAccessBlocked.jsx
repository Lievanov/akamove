"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, LogOut, RefreshCw } from "lucide-react";
import supabase from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import { planAllowsRole } from "@/app/dashboard/access";
import { Button } from "@/app/components/ui/Button";

// Full-page screen for staff whose studio is on Starter, which doesn't
// include team access. Shown by the dashboard layout instead of the whole
// dashboard. Offers a re-check (after the admin upgrades), a switch to
// another studio they can still use, and logging out.
function StaffAccessBlocked() {
  const router = useRouter();
  const { activeTenant, availableTenants, setActiveTenant, refreshTenants } =
    useActiveTenant();
  const [checking, setChecking] = useState(false);

  const otherStudios = availableTenants.filter(
    (t) => t.id !== activeTenant?.id && planAllowsRole(t.plan, t.role)
  );

  const handleCheckAgain = async () => {
    setChecking(true);
    await refreshTenants({ silent: true });
    setChecking(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-cream/30 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-brand-dark/10 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-cream text-brand-pink-deep">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-brand-dark">
          Ask your studio admin for access
        </h1>
        <p className="mt-2 text-sm text-brand-dark/70">
          <strong className="font-semibold text-brand-dark">
            {activeTenant?.name ?? "Your studio"}
          </strong>{" "}
          is on the Starter plan, which only includes admin accounts. To use
          the dashboard again, ask an admin at your studio to move to the
          Studio plan or higher.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={handleCheckAgain} disabled={checking}>
            <RefreshCw
              className={`h-4 w-4 ${checking ? "motion-safe:animate-spin" : ""}`}
              aria-hidden="true"
            />
            {checking ? "Checking…" : "My admin upgraded — check again"}
          </Button>
          {otherStudios.map((studio) => (
            <Button
              key={studio.id}
              variant="outline"
              onClick={() => setActiveTenant(studio)}
            >
              Go to {studio.name}
            </Button>
          ))}
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 border-t border-brand-dark/10 pt-4">
          <Image src="/images/am_logo.png" width={20} height={20} alt="" />
          <span className="text-xs text-brand-dark/60">aka Move</span>
        </div>
      </div>
    </main>
  );
}

export default StaffAccessBlocked;
