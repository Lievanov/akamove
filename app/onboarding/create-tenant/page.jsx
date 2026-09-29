"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { Check, LogOut } from "lucide-react";
import supabase, { getUser } from "@/lib/supabase/client";
import { getUserTenants, createTenantAndBecomeAdmin } from "@/api/tenant/tenant";
import { pricingTiers } from "@/app/components/landing/sectionsData";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { Button } from "@/app/components/ui/Button";
import TextInput from "@/app/components/ui/TextInput";
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

function CreateTenant() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [userEmail, setUserEmail] = useState("");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { plan: "starter" } });

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

      if (isActive) setCheckingAccess(false);
    };

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [router]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    const tenant = await createTenantAndBecomeAdmin(data.name, data.plan);
    setSubmitting(false);

    if (!tenant) {
      setAlert({
        text: "Failed to create your studio, please try again.",
        severity: "error",
      });
      return;
    }

    router.push("/dashboard");
  };

  const handleBackToHome = async () => {
    // A logged-in, tenant-less user visiting "/" gets bounced straight
    // back here (see app/page.js) — so "back to home" only makes sense
    // as a real sign-out, not a plain link.
    await supabase.auth.signOut();
    router.push("/");
  };

  if (checkingAccess) return <Loading />;

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
              className="rounded font-medium text-brand-pink underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
            >
              I&apos;m a staff member joining an existing studio
            </button>
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <div className="border-t border-brand-dark/10 pt-6">
              <TextInput
                property="name"
                label="Studio Name*"
                errors={errors}
                control={control}
                required="Studio name is required"
                placeholder="Downtown Dance Studio"
              />
            </div>

            <div className="mt-6">
              <span className="mb-1 block text-sm font-medium text-brand-dark">
                Plan*
              </span>
              <p className="mb-3 text-xs text-brand-dark/50">
                You can change this later in Settings.
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
                                  ? "border-brand-pink bg-brand-pink text-white"
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
                                  className="mt-0.5 h-3 w-3 shrink-0 text-brand-pink"
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
                <p className="mt-2 text-sm text-red-600">{errors.plan.message}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create Studio"}
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
