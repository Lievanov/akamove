"use client";
import Link from "next/link";
import { useState } from "react";
import moment from "moment";
import { ChevronRight, Sparkles } from "lucide-react";
import { useActiveTenant } from "@/app/context/TenantContext";
import { useOnboarding } from "@/app/context/OnboardingContext";
import { redeemTrialCode } from "@/api/tenant/tenant";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Alert } from "@/app/components/ui/Alert";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { cn } from "@/app/components/ui/utils/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

// Sidebar pill counting down an active Pro Studio trial (admins only).
// Opens a dialog with the end date, a place to redeem an extension code,
// and — once Stripe lands — the upgrade path. While studio setup is
// unfinished it also shows setup progress, linking to the checklist —
// a studio that's set up during its trial is one that sees the value.
const TrialStatusButton = () => {
  const { activeTenant, refreshTenants } = useActiveTenant();
  const setup = useOnboarding()?.setup;
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState({ text: "", severity: "" });

  if (
    activeTenant?.role !== "admin" ||
    activeTenant.trialStatus !== "active" ||
    !activeTenant.trialEndsAt
  ) {
    return null;
  }

  const daysLeft = Math.max(
    1,
    Math.ceil((activeTenant.trialEndsAt.getTime() - Date.now()) / DAY_MS)
  );
  const endingSoon = daysLeft <= 3;
  const label = daysLeft === 1 ? "Last day of Pro trial" : `${daysLeft} days left in trial`;
  const setupUnfinished = setup && !setup.dismissed && setup.completed < setup.total;

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    const { tenant, error } = await redeemTrialCode(activeTenant.id, code.trim());
    setRedeeming(false);

    if (!tenant) {
      setMessage({ text: error, severity: "error" });
      return;
    }

    setCode("");
    setMessage({
      text: `Code applied — your trial now ends ${moment(tenant.trial_ends_at).format("MMM D, YYYY")}.`,
      severity: "success",
    });
    refreshTenants({ silent: true });
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) setMessage({ text: "", severity: "" });
  };

  return (
    <>
      <div className="border-b border-brand-dark/10 px-3 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2",
            endingSoon
              ? "bg-brand-pink-deep text-white hover:bg-brand-pink-deeper"
              : "border border-brand-pink/40 bg-brand-cream/50 text-brand-pink-deep hover:bg-brand-cream"
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </button>
        {setupUnfinished && (
          <Link
            href="/dashboard"
            className="mt-2 block w-full rounded-md px-3 py-1.5 text-left hover:bg-brand-dark/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          >
            <span className="flex items-center justify-between text-xs font-medium text-brand-dark/70">
              Studio setup {setup.completed}/{setup.total}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-brand-dark/10">
              <span
                className="block h-full rounded-full bg-brand-pink transition-all duration-500"
                style={{ width: `${(setup.completed / setup.total) * 100}%` }}
              />
            </span>
          </Link>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Your Pro Studio trial</DialogTitle>
          <p className="text-sm text-brand-dark/70">
            You have every Pro Studio feature until{" "}
            <span className="font-medium text-brand-dark">
              {moment(activeTenant.trialEndsAt).format("MMM D, YYYY")}
            </span>
            . After that your studio moves to the free Starter plan — your data
            stays, but Pro-only features will be limited.
          </p>

          {!activeTenant.trialCode && (
            <div className="mt-5">
              <label
                htmlFor="trial-code"
                className="mb-1 block text-sm font-medium text-brand-dark"
              >
                Have a code from the aka Move team?
              </label>
              <div className="flex gap-2">
                <Input
                  id="trial-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                  placeholder="Enter code"
                />
                <Button
                  variant="outline"
                  onClick={handleRedeem}
                  disabled={redeeming || !code.trim()}
                >
                  {redeeming ? "Applying…" : "Apply"}
                </Button>
              </div>
            </div>
          )}

          {message.text && (
            <div className="mt-4">
              <Alert severity={message.severity}>{message.text}</Alert>
            </div>
          )}

          <DialogActions>
            {/* Stripe checkout goes here. */}
            <Button disabled title="Plans & billing are coming soon">
              Choose a plan — coming soon
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialStatusButton;
