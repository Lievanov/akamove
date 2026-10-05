"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { Check, LogOut, Sparkles } from "lucide-react";
import supabase, { getUser } from "@/lib/supabase/client";
import {
  getUserTenants,
  createTenantAndBecomeAdmin,
  hasUsedTrial,
} from "@/api/tenant/tenant";
import { saveTimezone, guessTimezone, TIMEZONE_OPTIONS } from "@/api/settings/settings";
import { createLocation } from "@/api/location/location";
import { pricingTiers } from "@/app/components/landing/sectionsData";
import LoadingScreen from "@/app/components/LoadingScreen";
import { Toast } from "@/app/components/ui/Toast";
import { Button } from "@/app/components/ui/Button";
import TextInput from "@/app/components/ui/TextInput";
import { Switch } from "@/app/components/ui/Switch";
import { Select } from "@/app/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { cn } from "@/app/components/ui/utils/cn";

// Self-serve signup only offers the three plans a studio can pick
// itself — "Serious Business" is a sales-contact tier, not something
// create_tenant_and_admin accepts. Reusing the marketing page's own
// pricingTiers keeps the price/cap/feature copy from drifting out of
// sync between the two screens.
const SIGNUP_PLANS = pricingTiers
  .filter((tier) => tier.name !== "Serious Business")
  .map((tier) => ({
    value: tier.name.toLowerCase(),
    name: tier.name,
    priceLabel: tier.price ?? `$${tier.monthlyPrice}`,
    cadence: tier.price ? tier.cadence : "/month",
    cap: tier.cap,
    features: tier.features,
  }));

// Keep in sync with v_trial_days in create_tenant_and_admin (migration 011).
const TRIAL_DAYS = 14;

// The trial is Pro Studio, so list every feature it unlocks outright
// instead of Pro's "Everything in Studio" shorthand.
const TRIAL_TIER = pricingTiers.find((tier) => tier.name === "Pro Studio");
const TRIAL_FEATURES = pricingTiers
  .slice(0, pricingTiers.indexOf(TRIAL_TIER) + 1)
  .flatMap((tier) => tier.features)
  .filter((feature) => !feature.startsWith("Everything in"));

function CreateTenant() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [userEmail, setUserEmail] = useState("");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      plan: "starter",
      pickPlan: false,
      trialCode: "",
      timezone: guessTimezone(),
      locationName: "",
      locationAddress: "",
    },
  });

  // One trial per user — someone who already had one goes straight to
  // the plan picker.
  const startingTrial = !trialUsed && !watch("pickPlan");

  useEffect(() => {
    let isActive = true;
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.replace("/");
        return;
      }
      setUserEmail(user.email ?? "");

      // Already onboarded — nothing to do here.
      const tenants = await getUserTenants(user.id);
      if (tenants.length > 0) {
        router.replace("/dashboard");
        return;
      }

      const usedTrial = await hasUsedTrial(user.id);

      if (isActive) {
        setTrialUsed(usedTrial);
        setCheckingAccess(false);
      }
    };

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [router]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    const { tenant, error } = await createTenantAndBecomeAdmin(
      data.name,
      startingTrial
        ? { trial: true, trialCode: showCodeInput ? data.trialCode : null }
        : { plan: data.plan }
    );

    if (!tenant) {
      setSubmitting(false);
      setAlert({ text: error, severity: "error" });
      return;
    }

    // The settings/location helpers write to the active tenant, which
    // they read from localStorage (lib/tenant/activeTenant.js) — point it
    // at the new studio first. TenantContext picks the same value up on
    // the dashboard. If either write fails, the dashboard's setup
    // checklist still walks the admin through it, so don't block on it.
    try {
      localStorage.setItem("activeTenant", JSON.stringify({ id: tenant.id, name: tenant.name }));
    } catch {}
    const locationName = data.locationName.trim();
    await Promise.all([
      saveTimezone(data.timezone),
      locationName &&
        createLocation({
          name: locationName,
          address: data.locationAddress.trim(),
          is_active: true,
        }),
    ]);

    router.push("/dashboard");
  };

  const handleBackToHome = async () => {
    // A logged-in, tenant-less user visiting "/" gets bounced straight
    // back here (see app/page.js) — so "back to home" only makes sense
    // as a real sign-out, not a plain link.
    await supabase.auth.signOut();
    router.push("/");
  };

  if (checkingAccess) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-brand-dark/10 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/images/am_logo.png" width={28} height={28} alt="aka Move Logo" />
          <span className="text-sm font-semibold text-brand-dark">aka Move</span>
        </div>
        <button
          type="button"
          onClick={handleBackToHome}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-brand-dark/60 hover:bg-brand-dark/5 hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
        >
          <LogOut className="h-4 w-4" />
          Not ready yet? Back to home
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="w-full rounded-lg border border-brand-dark/10 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-center text-2xl font-semibold text-brand-dark">
            Create your studio
          </h1>
          <p className="mt-2 text-center text-sm text-brand-dark/60">
            You&apos;re not part of a studio yet. Set one up to get started.
          </p>
          <p className="mt-3 text-center text-sm">
            <button
              type="button"
              onClick={() => setStaffDialogOpen(true)}
              className="rounded font-medium text-brand-pink-deep underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
            >
              I&apos;m a staff member joining an existing studio
            </button>
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <div className="border-t border-brand-dark/10 pt-6">
              <TextInput
                property="name"
                label="Studio Name"
                errors={errors}
                control={control}
                required="Studio name is required"
                placeholder="Downtown Dance Studio"
              />
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-brand-dark">
                  Where do you teach?
                </h2>
                <p className="mt-0.5 text-xs text-brand-dark/50">
                  Gets your studio ready for its first class schedule. You can
                  change both later.
                </p>
              </div>
              <div className="max-w-sm">
                <Select
                  property="timezone"
                  label="Timezone"
                  control={control}
                  errors={errors}
                  required="Timezone is required"
                  options={TIMEZONE_OPTIONS}
                />
                <p className="mt-1 text-xs text-brand-dark/50">
                  Decides when an event&apos;s day-of price applies.
                </p>
              </div>
              <div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextInput
                    property="locationName"
                    label="First location"
                    errors={errors}
                    control={control}
                    placeholder="Main Studio"
                    rules={{
                      validate: (value, values) =>
                        !!value.trim() ||
                        !values.locationAddress.trim() ||
                        "Give this location a name",
                    }}
                  />
                  <TextInput
                    property="locationAddress"
                    label="Address"
                    errors={errors}
                    control={control}
                    placeholder="123 Main St, Indianapolis, IN 46201"
                    rules={{
                      validate: (value, values) =>
                        !!value.trim() ||
                        !values.locationName.trim() ||
                        "Address is required for a location",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-brand-dark/50">
                  Optional — each location gets its own class schedule. You
                  can add more, or skip this for now, from the dashboard.
                </p>
              </div>
            </div>

            {!trialUsed && (
              <div className="mt-6">
                {startingTrial && (
                  <div className="rounded-lg border-2 border-brand-pink bg-brand-cream/40 p-5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-pink-deep">
                      <Sparkles className="h-3.5 w-3.5" />
                      Free for {TRIAL_DAYS} days
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-brand-dark">
                      Try Pro Studio, on us
                    </h2>
                    <p className="mt-1 text-sm text-brand-dark/70">
                      Every feature aka Move has, for up to 500 monthly active
                      students. After {TRIAL_DAYS} days you&apos;ll move to the free
                      Starter plan — or pick a plan whenever you&apos;re ready.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {["No credit card required", TRIAL_TIER.cap, "Nothing to cancel"].map(
                        (pill) => (
                          <span
                            key={pill}
                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-dark ring-1 ring-brand-dark/10"
                          >
                            {pill}
                          </span>
                        )
                      )}
                    </div>

                    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                      {TRIAL_FEATURES.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-1.5 text-sm text-brand-dark/80"
                        >
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-pink-deep"
                            strokeWidth={2.5}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 border-t border-brand-dark/10 pt-3">
                      {showCodeInput ? (
                        <TextInput
                          property="trialCode"
                          label="Trial code"
                          errors={errors}
                          control={control}
                          placeholder="Code from the aka Move team"
                          parse={(value) => value.toUpperCase()}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCodeInput(true)}
                          className="rounded text-sm font-medium text-brand-pink-deep underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
                        >
                          Have a code from the aka Move team?
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <Switch
                  property="pickPlan"
                  control={control}
                  label="Already know what you need? Pick a plan"
                  className={startingTrial ? "mt-4" : ""}
                />
              </div>
            )}

            {!startingTrial && (
              <div className="mt-6">
                <span className="mb-1 block text-sm font-medium text-brand-dark">
                  Plan*
                </span>
                <p className="mb-3 text-xs text-brand-dark/50">
                  {trialUsed && "You've already used your free trial. "}
                  Paid plans don&apos;t charge anything today — we&apos;ll ask for
                  payment details later.
                </p>
                <Controller
                  name="plan"
                  control={control}
                  rules={{ required: "Plan is required" }}
                  render={({ field }) => (
                    <div
                      role="radiogroup"
                      aria-label="Plan"
                      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    >
                      {SIGNUP_PLANS.map((plan) => {
                        const selected = field.value === plan.value;
                        return (
                          <button
                            key={plan.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(plan.value)}
                            className={cn(
                              "flex flex-col rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2",
                              selected
                                ? "border-brand-pink ring-2 ring-brand-pink/20"
                                : "border-brand-dark/10 hover:border-brand-dark/25"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-brand-dark">
                                {plan.name}
                              </span>
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                  selected
                                    ? "border-brand-pink-deep bg-brand-pink-deep text-white"
                                    : "border-brand-dark/20"
                                )}
                              >
                                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                              </span>
                            </div>
                            <p className="mt-2 flex items-baseline gap-1">
                              <span className="text-xl font-semibold text-brand-dark">
                                {plan.priceLabel}
                              </span>
                              {plan.cadence && (
                                <span className="text-xs text-brand-dark/50">
                                  {plan.cadence}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-brand-dark/50">{plan.cap}</p>
                            <ul className="mt-3 space-y-1.5">
                              {plan.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-1.5 text-xs text-brand-dark/70"
                                >
                                  <Check
                                    className="mt-0.5 h-3 w-3 shrink-0 text-brand-pink-deep"
                                    strokeWidth={2.5}
                                  />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.plan && (
                  <p className="mt-2 text-sm text-danger">{errors.plan.message}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Creating…"
                  : startingTrial
                    ? "Start my free trial"
                    : "Create Studio"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogTitle>Ask your studio&apos;s admin to invite you</DialogTitle>
          <p className="text-sm text-brand-dark/70">
            Staff accounts are added by an existing admin, not created here —
            that keeps your studio&apos;s roster under their control.
          </p>
          <p className="mt-3 text-sm text-brand-dark/70">
            Ask your admin to open{" "}
            <span className="font-medium text-brand-dark">
              Settings → Manage Team
            </span>{" "}
            in aka Move and invite{" "}
            {userEmail ? (
              <span className="font-medium text-brand-dark">{userEmail}</span>
            ) : (
              "the email you signed in with"
            )}
            . Once they do, just log in again with that same email and
            you&apos;ll land straight in their studio.
          </p>
          <DialogActions>
            <Button onClick={() => setStaffDialogOpen(false)}>Got it</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateTenant;
