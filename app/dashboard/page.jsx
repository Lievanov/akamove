"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TotalStudents from "../components/charts/TotalStudents";
import { PageHeader } from "@/app/components/ui/PageHeader";
import ActiveInactiveStudents from "../components/charts/ActiveInactiveStudents";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import Loading from "../components/Loading";

function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { activeTenant, tenantsLoading } = useActiveTenant();
  const isAdmin = activeTenant?.role === "admin";

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.push("/");
        return;
      }

      if (tenantsLoading) return;

      setLoading(false);
    };

    checkAccess();
  }, [router, tenantsLoading]);

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {isAdmin && (
            <div className="flex h-60 flex-col rounded-lg border border-brand-dark/10 p-4">
              <h2 className="mb-2 text-base font-semibold text-brand-dark">
                Current Period Active / Inactive Students
              </h2>
              <ActiveInactiveStudents />
            </div>
          )}
          {isAdmin && (
            <div className="flex h-60 flex-col rounded-lg border border-brand-dark/10 p-4">
              <TotalStudents />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
