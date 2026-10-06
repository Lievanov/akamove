"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogActions } from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Alert } from "@/app/components/ui/Alert";
import { cancelMembership, sendCancelFeedback } from "@/api/billing/billing";
import { formatDate } from "@/app/components/utils/utils";
import { cn } from "@/app/components/ui/utils/cn";
import { toDate } from "./plans";

// Values match Stripe's cancellation_details.feedback (see
// app/api/billing/cancel-feedback).
const REASONS = [
  { value: "too_expensive", label: "It costs too much" },
  { value: "missing_features", label: "It's missing something we need" },
  { value: "unused", label: "We aren't using it enough" },
  { value: "switched_service", label: "We're switching to another tool" },
  { value: "too_complex", label: "It's too hard to use" },
  { value: "low_quality", label: "It didn't work well for us" },
  { value: "customer_service", label: "Support didn't help enough" },
  { value: "other", label: "Something else" },
];

// Cancel in one step, then an optional survey. The cancel happens on the
// first confirm; closing or skipping the survey changes nothing.
function CancelMembershipDialog({ open, onOpenChange, tenantId, planName, periodEnd, warnings, onCancelled }) {
  const [step, setStep] = useState("confirm");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [endsAt, setEndsAt] = useState(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const close = () => {
    if (working) return;
    onOpenChange(false);
    // Reset after the close animation so the dialog doesn't flash.
    setTimeout(() => {
      setStep("confirm");
      setError("");
      setReason("");
      setComment("");
    }, 200);
  };

  const handleCancel = async () => {
    setWorking(true);
    setError("");
    const { data, error: cancelError } = await cancelMembership(tenantId);
    setWorking(false);
    if (cancelError) {
      setError(cancelError);
      return;
    }
    setEndsAt(data.immediate ? null : toDate(data.endsAt));
    setStep("survey");
    onCancelled?.(data);
  };

  const handleFeedback = async () => {
    setWorking(true);
    // Best effort — the cancel already went through.
    await sendCancelFeedback(tenantId, reason, comment);
    setWorking(false);
    setStep("thanks");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-md">
        {step === "confirm" && (
          <>
            <DialogTitle>Cancel your membership?</DialogTitle>
            <div className="space-y-3 text-sm text-brand-dark/70">
              <p>
                You keep {planName} until{" "}
                <span className="font-medium text-brand-dark">{formatDate(periodEnd)}</span>, then
                your studio moves to Starter (free). You won&apos;t be charged again.
              </p>
              {warnings}
              <p>Nothing is deleted — your students, payments and history stay as they are.</p>
            </div>
            {error && (
              <Alert severity="error" className="mt-4">
                {error}
              </Alert>
            )}
            <DialogActions>
              <Button variant="ghost" onClick={close} disabled={working}>
                Keep my plan
              </Button>
              <Button
                onClick={handleCancel}
                disabled={working}
                className="bg-danger hover:bg-danger/90"
              >
                {working ? "Cancelling…" : "Cancel membership"}
              </Button>
            </DialogActions>
          </>
        )}

        {step === "survey" && (
          <>
            <DialogTitle>Your membership is cancelled</DialogTitle>
            <p className="-mt-2 text-sm text-brand-dark/70">
              {endsAt
                ? `You keep ${planName} until ${formatDate(endsAt)}. Changed your mind? You can resume any time before then.`
                : "Your studio is now on Starter."}
            </p>
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-brand-dark">
                What&apos;s the main reason you&apos;re leaving?{" "}
                <span className="font-normal text-brand-dark/60">(optional)</span>
              </legend>
              <div className="mt-2 space-y-1">
                {REASONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-brand-dark hover:bg-brand-dark/5 touch:py-3",
                      reason === option.value && "bg-brand-pink/10 hover:bg-brand-pink/10"
                    )}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => setReason(option.value)}
                      className="h-4 w-4 accent-brand-pink-deep"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {reason && (
              <label className="mt-4 block text-sm font-medium text-brand-dark">
                Anything else we should know?{" "}
                <span className="font-normal text-brand-dark/60">(optional)</span>
                <Input
                  rows={3}
                  maxLength={2000}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-1.5"
                />
              </label>
            )}
            <DialogActions>
              <Button variant="ghost" onClick={close} disabled={working}>
                Skip
              </Button>
              <Button onClick={handleFeedback} disabled={working || !reason}>
                {working ? "Sending…" : "Send feedback"}
              </Button>
            </DialogActions>
          </>
        )}

        {step === "thanks" && (
          <>
            <DialogTitle>Thanks for telling us</DialogTitle>
            <p className="-mt-2 text-sm text-brand-dark/70">
              We read every answer. If you come back, everything will be where you left it.
            </p>
            <DialogActions>
              <Button onClick={close}>Done</Button>
            </DialogActions>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CancelMembershipDialog;
