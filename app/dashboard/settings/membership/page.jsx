"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CreditCard } from "lucide-react";
import { useActiveTenant } from "@/app/context/TenantContext";
import { downgradeTenantPlan, getStaffCount } from "@/api/tenant/tenant";
import {
  changePlan,
  getTenantBilling,
  openBillingPortal,
  resumeMembership,
  startCheckout,
} from "@/api/billing/billing";
import { getStudentCount } from "@/api/student/students";
import { getActiveVsNonActiveStudents } from "@/api/charts/students";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { Chip } from "@/app/components/ui/Chip";
import { Alert } from "@/app/components/ui/Alert";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import SettingsTabs from "@/app/components/membership/SettingsTabs";
import IntervalToggle from "@/app/components/membership/IntervalToggle";
import UpgradeDialog from "@/app/components/membership/UpgradeDialog";
import CancelMembershipDialog from "@/app/components/membership/CancelMembershipDialog";
import {
  PLANS,
  getPlan,
  featuresLost,
  pricePerInterval,
  toDate,
} from "@/app/components/membership/plans";
import { hasLiveSubscription, planChangeKind } from "@/lib/billing/catalog.mjs";
import { formatDate } from "@/app/components/utils/utils";
import { cn } from "@/app/components/ui/utils/cn";

const DAY_MS = 24 * 60 * 60 * 1000;
// Matches the checkout route: a trial needs 48h left to carry over.
const MIN_TRIAL_CARRY_MS = 49 * 60 * 60 * 1000;
const OWES_MONEY = ["past_due", "unpaid", "incomplete"];
// After Checkout, wait this long for Stripe's webhook before giving up.
const ACTIVATION_POLLS = 10;
const ACTIVATION_POLL_MS = 2000;

const CARD_BRANDS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  link: "Link",
};

function PlanCard({ plan, interval, current, badge, action }) {
  const paid = plan.monthlyPrice != null;
  return (
    <li
      className={cn(
        "flex flex-col rounded-lg border bg-white p-5",
        current ? "border-brand-pink-deep ring-1 ring-brand-pink-deep" : "border-brand-dark/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-brand-dark">{plan.name}</h3>
        {badge && <Chip label={badge} tone="accent" className="px-2 py-0.5" />}
      </div>
      <p className="mt-2 text-brand-dark">
        <span className="text-2xl font-semibold tabular-nums">
          {paid
            ? `$${(interval === "year" ? plan.yearlyPrice : plan.monthlyPrice).toLocaleString("en-US")}`
            : plan.priceLabel}
        </span>
        <span className="ml-1 text-sm text-brand-dark/70">
          {paid ? `/${interval}` : plan.cadence}
        </span>
      </p>
      <p className="mt-1 text-sm text-brand-dark/70">
        {paid && interval === "year"
          ? `$${(plan.yearlyPrice / 12).toFixed(2)}/month, billed yearly · `
          : ""}
        {plan.cap}
      </p>
      <ul className="mt-4 flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-brand-dark">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-pink-deep" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-2">
        {action?.label && (
          <Button
            variant={action.variant ?? "outline"}
            className="w-full"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        )}
        {action?.note && <p className="text-sm text-brand-dark/70">{action.note}</p>}
      </div>
    </li>
  );
}

function Membership() {
  const router = useRouter();
  const { activeTenant, refreshTenants } = useActiveTenant();
  const tenantId = activeTenant?.id;
  const [billing, setBilling] = useState(undefined);
  const [interval, setBillingInterval] = useState("month");
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [counts, setCounts] = useState({ total: null, active: null, staff: null });
  const [busy, setBusy] = useState("");
  const [activating, setActivating] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState(null);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const intervalChosen = useRef(false);

  const toast = (text, severity = "success") => setAlert({ text, severity });

  const loadBilling = useCallback(async () => {
    const next = await getTenantBilling(tenantId);
    setBilling(next);
    if (next?.billing_interval && !intervalChosen.current) {
      setBillingInterval(next.billing_interval);
    }
    return next;
  }, [tenantId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadBilling(), refreshTenants({ silent: true })]);
  }, [loadBilling, refreshTenants]);

  useEffect(() => {
    if (tenantId) loadBilling();
  }, [tenantId, loadBilling]);

  useEffect(() => {
    Promise.all([getStudentCount(), getActiveVsNonActiveStudents(), getStaffCount(tenantId)]).then(
      ([total, active, staff]) =>
        setCounts({ total: total ?? null, active: active?.[0]?.active_students ?? null, staff })
    );
  }, [tenantId]);

  // Coming back from the Stripe Portal or a hosted invoice page (opened
  // in another tab): pick up whatever changed there.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && tenantId && refreshAll();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [tenantId, refreshAll]);

  // Back from Stripe Checkout (?checkout=success|canceled|failed). The
  // plan only changes when Stripe's webhook lands, so wait for it rather
  // than trusting the redirect.
  useEffect(() => {
    if (!tenantId) return;
    const result = new URLSearchParams(window.location.search).get("checkout");
    if (!result) return;
    router.replace("/dashboard/settings/membership");

    if (result === "canceled") {
      toast("Checkout cancelled — nothing was charged.", "info");
      return;
    }
    if (result === "failed") {
      toast("We couldn't open checkout. Pick your plan below to try again.", "error");
      return;
    }

    let cancelled = false;
    setActivating(true);
    (async () => {
      for (let attempt = 0; attempt < ACTIVATION_POLLS && !cancelled; attempt += 1) {
        const next = await loadBilling();
        if (hasLiveSubscription(next)) {
          await refreshTenants({ silent: true });
          if (!cancelled) {
            setActivating(false);
            toast(`You're all set — welcome to ${getPlan(next.plan).name}.`);
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, ACTIVATION_POLL_MS));
      }
      if (!cancelled) {
        setActivating(false);
        toast(
          "Your payment went through, but your plan is still activating. Refresh this page in a minute.",
          "info"
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // State -----------------------------------------------------------------

  const current = getPlan(activeTenant?.plan);
  const exempt = !!activeTenant?.billingExempt;
  const subscribed = hasLiveSubscription(billing);
  const subscribedPlan = subscribed ? getPlan(billing.plan) : null;
  const periodEnd = toDate(billing?.current_period_end);
  const owesMoney = subscribed && OWES_MONEY.includes(billing.status);
  const awaitingUpgradePayment = subscribed && !owesMoney && !!billing.latest_invoice_url;
  const pendingCancel = subscribed && billing.cancel_at_period_end;
  const scheduledPlan = subscribed && billing.scheduled_plan ? getPlan(billing.scheduled_plan) : null;
  const pendingChange = pendingCancel || !!scheduledPlan;
  const trialingSubscription = subscribed && billing.status === "trialing";
  const onTrial = !subscribed && activeTenant?.trialStatus === "active" && activeTenant?.trialEndsAt;
  const trialEndsAt = onTrial ? activeTenant.trialEndsAt : null;
  const daysLeft = onTrial ? Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS)) : null;
  const trialCarriesOver = onTrial && trialEndsAt.getTime() - Date.now() >= MIN_TRIAL_CARRY_MS;
  const loading = billing === undefined;

  // Actions ---------------------------------------------------------------

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy("");
    }
  };

  const goToCheckout = (plan) =>
    run(`checkout-${plan.value}`, async () => {
      const { data, error } = await startCheckout(tenantId, plan.value, interval);
      if (error) return toast(error, "error");
      window.location.assign(data.url);
    });

  const goToPortal = (flow) =>
    run(`portal-${flow ?? "home"}`, async () => {
      const { data, error } = await openBillingPortal(tenantId, flow);
      if (error) return toast(error, "error");
      window.location.assign(data.url);
    });

  const handleResume = () =>
    run("resume", async () => {
      const { error } = await resumeMembership(tenantId);
      if (error) return toast(error, "error");
      await refreshAll();
      toast("Done — your membership continues as it was.");
    });

  // Downgrade: scheduled for the period end when subscribed; the old
  // immediate switch for studios without a subscription (a trial → Starter).
  const handleDowngrade = async () => {
    const target = downgradeTarget;
    if (!subscribed) {
      const { tenant, error } = await downgradeTenantPlan(tenantId, target.value);
      if (!tenant) return toast(error, "error");
      await refreshAll();
      return toast(`Your studio is now on ${target.name}.`);
    }
    if (pendingChange) {
      const { error } = await resumeMembership(tenantId);
      if (error) return toast(error, "error");
    }
    const { data, error } = await changePlan(tenantId, target.value, interval);
    await refreshAll();
    if (error) return toast(error, "error");
    toast(`You'll switch to ${target.name} on ${formatDate(toDate(data.effectiveAt))}.`);
  };

  const handleUpgradeDone = async (result) => {
    await refreshAll();
    if (result.status === "applied") toast(`You're now on ${upgradeTarget.name}.`);
  };

  // Plan cards --------------------------------------------------------------

  const cardFor = (plan) => {
    const isStarter = plan.monthlyPrice == null;
    const sameAsSubscription =
      subscribed && plan.value === billing.plan && (isStarter || interval === billing.billing_interval);
    const isCurrent = plan.value === current.value && (!subscribed || isStarter || sameAsSubscription);

    let badge = isCurrent ? (onTrial || trialingSubscription ? "Current plan · trial" : "Current plan") : null;
    let action = null;

    if (exempt) {
      action = { note: isCurrent ? "Managed by the aka Move team." : "Contact us to change your plan." };
    } else if (isStarter) {
      if (current.value === "starter") action = { note: "You're on this plan." };
      else if (pendingCancel)
        action = { note: `Your studio moves here on ${formatDate(periodEnd)}.` };
      else if (subscribed)
        action = { label: "Cancel membership", onClick: () => setCancelOpen(true), disabled: !!busy };
      else action = { label: "Switch to Starter", onClick: () => setDowngradeTarget(plan), disabled: !!busy };
    } else if (subscribed) {
      const kind = planChangeKind(
        { plan: billing.plan, interval: billing.billing_interval },
        { plan: plan.value, interval }
      );
      if (kind === "none") {
        if (trialingSubscription) badge = badge ?? "After your trial";
        else badge = badge ?? "Your plan";
        action = {
          note: pendingCancel
            ? `Ends ${formatDate(periodEnd)}.`
            : trialingSubscription
              ? `Billing starts ${formatDate(periodEnd)}.`
              : `Renews ${formatDate(periodEnd)}.`,
        };
      } else if (scheduledPlan?.value === plan.value && billing.scheduled_interval === interval) {
        action = { note: `Starts ${formatDate(toDate(billing.scheduled_change_at))}.` };
      } else if (owesMoney) {
        action = { label: kind === "upgrade" ? "Upgrade" : "Switch", disabled: true, note: "Settle your last payment first." };
      } else if (kind === "upgrade") {
        action = {
          label: "Upgrade",
          variant: "primary",
          onClick: () => setUpgradeTarget(plan),
          disabled: !!busy,
        };
      } else {
        action = {
          label: trialingSubscription ? `Switch to ${plan.name}` : `Switch on ${formatDate(periodEnd)}`,
          onClick: () => setDowngradeTarget(plan),
          disabled: !!busy,
        };
      }
    } else {
      const key = `checkout-${plan.value}`;
      action = {
        label: busy === key ? "Opening checkout…" : onTrial ? `Keep ${plan.name} after the trial` : `Get ${plan.name}`,
        variant: plan.value === current.value || !onTrial ? "primary" : "outline",
        onClick: () => goToCheckout(plan),
        disabled: !!busy || activating,
        note: onTrial
          ? trialCarriesOver
            ? `No charge until your trial ends on ${formatDate(trialEndsAt)}.`
            : "Your trial ends within 2 days, so you'll be charged today."
          : null,
      };
    }

    return { badge, action, isCurrent };
  };

  // Downgrade / cancel warnings ---------------------------------------------

  const warningsFor = (target) => {
    if (!target) return null;
    const lost = featuresLost(current.value, target.value);
    const relevantCount = target.limitBasis === "total" ? counts.total : counts.active;
    const overLimit = relevantCount != null && relevantCount > target.studentLimit;
    return (
      <>
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
            They&apos;ll see a message asking them to contact an admin until you move back to
            Studio or higher.
          </span>
        )}
      </>
    );
  };

  const downgradeDescription = downgradeTarget && (
    <span className="block space-y-3">
      {subscribed && !trialingSubscription && (
        <span className="block">
          You keep {subscribedPlan.name} until {formatDate(periodEnd)}. After that you&apos;ll pay{" "}
          {pricePerInterval(downgradeTarget, interval)} plus any tax.
        </span>
      )}
      {warningsFor(downgradeTarget)}
      {onTrial && (
        <span className="block">
          This ends your Pro Studio trial today. Each account gets one free trial, so it won&apos;t
          start over.
        </span>
      )}
      {pendingChange && (
        <span className="block font-medium">This replaces the change you already scheduled.</span>
      )}
      <span className="block">
        Nothing is deleted — your students, payments and history stay as they are.
      </span>
    </span>
  );

  // Render --------------------------------------------------------------------

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
          <Link href="/dashboard/settings/team" className={buttonVariants({ variant: "outline" })}>
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
              {subscribed
                ? `${pricePerInterval(subscribedPlan, billing.billing_interval)} + tax`
                : `${current.priceLabel}${current.cadence ? ` ${current.cadence}` : ""}`}{" "}
              · {current.cap}
            </span>
          </p>

          {exempt ? (
            <p className="mt-2 text-sm text-brand-dark/70">
              Your plan is managed by the aka Move team — contact us to change it.
            </p>
          ) : loading ? (
            <p className="mt-2 text-sm text-brand-dark/70">Loading billing…</p>
          ) : trialingSubscription ? (
            <p className="mt-2 text-sm text-brand-dark/70">
              Free trial until {formatDate(periodEnd)}. Then {subscribedPlan.name} at{" "}
              {pricePerInterval(subscribedPlan, billing.billing_interval)} plus tax — your card is
              saved and nothing is charged before then.
            </p>
          ) : pendingCancel ? (
            <p className="mt-2 text-sm text-brand-dark/70">
              Cancels on <span className="font-medium text-brand-dark">{formatDate(periodEnd)}</span>
              . After that your studio moves to Starter and you won&apos;t be charged again.
            </p>
          ) : scheduledPlan ? (
            <p className="mt-2 text-sm text-brand-dark/70">
              Switches to {scheduledPlan.name} (
              {pricePerInterval(scheduledPlan, billing.scheduled_interval)}) on{" "}
              <span className="font-medium text-brand-dark">
                {formatDate(toDate(billing.scheduled_change_at))}
              </span>
              .
            </p>
          ) : subscribed ? (
            <p className="mt-2 text-sm text-brand-dark/70">Renews on {formatDate(periodEnd)}.</p>
          ) : onTrial ? (
            <p className="mt-2 text-sm text-brand-dark/70">
              Free trial — {daysLeft === 1 ? "last day" : `${daysLeft} days left`}, ends{" "}
              {formatDate(trialEndsAt)}. Pick a plan below to keep going after it; without one,
              your studio moves to Starter and staff lose access to the dashboard.
            </p>
          ) : null}

          {pendingChange && !exempt && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleResume}
              disabled={!!busy}
            >
              {busy === "resume"
                ? "Working…"
                : pendingCancel
                  ? "Resume membership"
                  : `Keep ${subscribedPlan.name}`}
            </Button>
          )}

          {activating && (
            <Alert severity="info" className="mt-4">
              <span aria-live="polite">Confirming your payment with Stripe…</span>
            </Alert>
          )}

          {owesMoney && (
            <Alert severity="error" className="mt-4">
              <p className="font-medium">
                {billing.status === "incomplete"
                  ? "Your payment hasn't gone through yet."
                  : "Your last payment didn't go through."}
              </p>
              <p className="mt-1">
                Your plan stays active while we retry. Pay now or update your card to settle it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {billing.latest_invoice_url && (
                  <a
                    href={billing.latest_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm" })}
                  >
                    Pay now
                  </a>
                )}
                <Button size="sm" variant="outline" onClick={() => goToPortal("payment_method")} disabled={!!busy}>
                  Update card
                </Button>
              </div>
            </Alert>
          )}

          {awaitingUpgradePayment && (
            <Alert severity="warning" className="mt-4">
              Your upgrade is waiting on a payment — your plan changes once it goes through.{" "}
              <a
                href={billing.latest_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                Finish payment
              </a>
            </Alert>
          )}

          {current.value === "starter" && !pendingCancel && (
            <Alert severity="warning" className="mt-4">
              Starter only includes admin accounts. Staff who log in see a message asking them to
              contact an admin.
            </Alert>
          )}

          {billing?.stripe_subscription_id && (
            <div className="mt-5 flex flex-col gap-3 border-t border-brand-dark/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-brand-dark">
                <CreditCard className="h-4 w-4 text-brand-dark/60" aria-hidden="true" />
                {billing.payment_method_brand
                  ? `${CARD_BRANDS[billing.payment_method_brand] ?? billing.payment_method_brand}${
                      billing.payment_method_last4 ? ` •••• ${billing.payment_method_last4}` : ""
                    }`
                  : "No card on file"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => goToPortal("payment_method")}
                  disabled={!!busy}
                >
                  {busy === "portal-payment_method" ? "Opening…" : "Update card"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => goToPortal()} disabled={!!busy}>
                  {busy === "portal-home" ? "Opening…" : "Invoices & billing details"}
                </Button>
              </div>
            </div>
          )}
        </section>

        <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-dark">Plans</h2>
          {!exempt && (
            <IntervalToggle
              value={interval}
              onChange={(value) => {
                intervalChosen.current = true;
                setBillingInterval(value);
              }}
            />
          )}
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const { badge, action, isCurrent } = loading
              ? { badge: null, action: null, isCurrent: plan.value === current.value }
              : cardFor(plan);
            return (
              <PlanCard
                key={plan.value}
                plan={plan}
                interval={interval}
                current={isCurrent}
                badge={badge}
                action={action}
              />
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-brand-dark/60">
          Prices are in US dollars; sales tax is added where it applies. Upgrades take effect right
          away; switching to a lower plan or cancelling takes effect at the end of your billing
          period.
        </p>
      </div>

      <ConfirmDialog
        open={!!downgradeTarget}
        onOpenChange={(open) => !open && setDowngradeTarget(null)}
        title={
          downgradeTarget
            ? subscribed && !trialingSubscription
              ? `Switch to ${downgradeTarget.name} on ${formatDate(periodEnd)}?`
              : `Switch to ${downgradeTarget.name}?`
            : ""
        }
        description={downgradeDescription}
        confirmLabel={downgradeTarget ? `Switch to ${downgradeTarget.name}` : "Switch"}
        onConfirm={handleDowngrade}
      />

      <UpgradeDialog
        open={!!upgradeTarget}
        onOpenChange={(open) => !open && setUpgradeTarget(null)}
        tenantId={tenantId}
        plan={upgradeTarget}
        interval={interval}
        pendingChange={pendingChange}
        onDone={handleUpgradeDone}
      />

      {/* Stays mounted after the cancel so the survey step survives the
          refresh (an immediate cancel ends the subscription). */}
      <CancelMembershipDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        tenantId={tenantId}
        planName={trialingSubscription || !subscribedPlan ? current.name : subscribedPlan.name}
        periodEnd={periodEnd}
        warnings={<span className="block space-y-3">{warningsFor(getPlan("starter"))}</span>}
        onCancelled={refreshAll}
      />
    </>
  );
}

export default Membership;
