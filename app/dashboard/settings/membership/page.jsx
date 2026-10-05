"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useActiveTenant } from "@/app/context/TenantContext";
import { downgradeTenantPlan, getStaffCount } from "@/api/tenant/tenant";
import { getStudentCount } from "@/api/student/students";
import { getActiveVsNonActiveStudents } from "@/api/charts/students";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { Chip } from "@/app/components/ui/Chip";
import { Alert } from "@/app/components/ui/Alert";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import SettingsTabs from "@/app/components/membership/SettingsTabs";
import { PLANS, getPlan, featuresLost } from "@/app/components/membership/plans";
import { formatDate } from "@/app/components/utils/utils";
import { cn } from "@/app/components/ui/utils/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

function PlanCard({ plan, current, onSwitch }) {
  const isCurrent = plan.rank === current.rank;
  const isLower = plan.rank < current.rank;
  return (
    <li
      className={cn(
        "flex flex-col rounded-lg border bg-white p-5",
        isCurrent ? "border-brand-pink-deep ring-1 ring-brand-pink-deep" : "border-brand-dark/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-brand-dark">{plan.name}</h3>
        {isCurrent && <Chip label="Current plan" tone="accent" className="px-2 py-0.5" />}
      </div>
      <p className="mt-2 text-brand-dark">
        <span className="text-2xl font-semibold tabular-nums">{plan.priceLabel}</span>
        {plan.cadence && (
          <span className="ml-1 text-sm text-brand-dark/70">{plan.cadence}</span>
        )}
      </p>
      <p className="mt-1 text-sm text-brand-dark/70">{plan.cap}</p>
      <ul className="mt-4 flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-brand-dark">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-pink-deep" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        {isCurrent ? (
          <p className="text-sm text-brand-dark/70">You&apos;re on this plan.</p>
        ) : isLower ? (
          <Button variant="outline" className="w-full" onClick={() => onSwitch(plan)}>
            Switch to {plan.name}
          </Button>
        ) : (
          <p className="text-sm text-brand-dark/70">
            Upgrades open once online billing is live.
          </p>
        )}
      </div>
    </li>
  );
}

function Membership() {
  const { activeTenant, refreshTenants } = useActiveTenant();
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [target, setTarget] = useState(null);
  const [counts, setCounts] = useState({ total: null, active: null, staff: null });

  const current = getPlan(activeTenant?.plan);
  const onTrial = activeTenant?.trialStatus === "active" && activeTenant?.trialEndsAt;
  const daysLeft = onTrial
    ? Math.max(1, Math.ceil((activeTenant.trialEndsAt.getTime() - Date.now()) / DAY_MS))
    : null;

  useEffect(() => {
    Promise.all([
      getStudentCount(),
      getActiveVsNonActiveStudents(),
      getStaffCount(activeTenant?.id),
    ]).then(([total, active, staff]) =>
      setCounts({
        total: total ?? null,
        active: active?.[0]?.active_students ?? null,
        staff,
      })
    );
  }, [activeTenant?.id]);

  const handleConfirm = async () => {
    const { tenant, error } = await downgradeTenantPlan(activeTenant.id, target.value);
    if (!tenant) {
      setAlert({ text: error, severity: "error" });
      return;
    }
    await refreshTenants({ silent: true });
    setAlert({ text: `Your studio is now on ${target.name}.`, severity: "success" });
  };

  // What the confirmation needs to warn about for the chosen plan.
  const lost = target ? featuresLost(current.value, target.value) : [];
  const relevantCount = target
    ? target.limitBasis === "total"
      ? counts.total
      : counts.active
    : null;
  const overLimit = target && relevantCount != null && relevantCount > target.studentLimit;

  const confirmDescription = target && (
    <span className="block space-y-3">
      {lost.length > 0 && (
        <span className="block">
          {target.name} doesn&apos;t include: {lost.join(", ")}.
        </span>
      )}
      {overLimit && (
        <span className="block font-medium text-warning">
          You have {relevantCount} {target.limitBasis === "total" ? "students" : "active students"};{" "}
          {target.name} covers {target.cap.toLowerCase()}.
        </span>
      )}
      {target.value === "starter" && (
        <span className="block font-medium text-warning">
          {counts.staff > 0
            ? `${counts.staff} staff ${counts.staff === 1 ? "member" : "members"} will lose access to the dashboard.`
            : "Staff accounts can't use the dashboard on Starter."}{" "}
          They&apos;ll see a message asking them to contact an admin until you
          move back to Studio or higher.
        </span>
      )}
      {onTrial && (
        <span className="block">
          This ends your Pro Studio trial today. Each account gets one free trial, so it won&apos;t start over.
        </span>
      )}
      <span className="block">
        Nothing is deleted — your students, payments and history stay as they
        are.
      </span>
    </span>
  );

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader
        title="Settings"
        actions={
          <Link
            href="/dashboard/settings/team"
            className={buttonVariants({ variant: "outline" })}
          >
            Manage team
          </Link>
        }
      />
      <SettingsTabs />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <section
          aria-labelledby="current-plan-title"
          className="rounded-lg border border-brand-dark/10 bg-white p-6"
        >
          <h2 id="current-plan-title" className="text-sm font-semibold text-brand-dark/70">
            Your plan
          </h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold text-brand-dark">{current.name}</span>
            <span className="text-sm text-brand-dark/70">
              {current.priceLabel}
              {current.cadence && ` ${current.cadence}`} · {current.cap}
            </span>
          </p>
          {onTrial ? (
            <p className="mt-2 text-sm text-brand-dark/70">
              Free trial — {daysLeft === 1 ? "last day" : `${daysLeft} days left`}, ends{" "}
              {formatDate(activeTenant.trialEndsAt)}. When it ends, your studio
              moves to Starter and staff accounts lose access to the dashboard.
            </p>
          ) : null}
          {current.value === "starter" && (
            <Alert severity="warning" className="mt-4">
              Starter only includes admin accounts. Staff who log in see a
              message asking them to contact an admin.
            </Alert>
          )}
          <Alert severity="info" className="mt-4">
            Online billing isn&apos;t live yet, so you aren&apos;t being charged for
            any plan. You can move to a lower plan here at any time.
          </Alert>
        </section>

        <h2 className="mb-3 mt-8 text-lg font-semibold text-brand-dark">Plans</h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.value} plan={plan} current={current} onSwitch={setTarget} />
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? `Switch to ${target.name}?` : ""}
        description={confirmDescription}
        confirmLabel={target ? `Switch to ${target.name}` : "Switch"}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export default Membership;
