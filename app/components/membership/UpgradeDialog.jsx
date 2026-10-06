"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogActions } from "@/app/components/ui/Dialog";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Alert";
import { changePlan, previewPlanChange, resumeMembership } from "@/api/billing/billing";
import { formatCents, pricePerInterval } from "./plans";

// Confirm an upgrade for a subscribed studio. Asks Stripe for the exact
// amount first (prorated, tax included) and charges exactly that. A
// declined card or a bank check (3D Secure) leaves the plan unchanged and
// offers Stripe's payment page to finish.
//
// pendingChange: the studio has a cancel or downgrade scheduled; the
// upgrade undoes it first (resume), and the dialog says so.
function UpgradeDialog({ open, onOpenChange, tenantId, plan, interval, pendingChange, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState(null);

  useEffect(() => {
    if (!open || !plan) return;
    let active = true;
    setPreview(null);
    setLoadError("");
    setError("");
    setInvoiceUrl(null);
    previewPlanChange(tenantId, plan.value, interval).then(({ data, error: previewError }) => {
      if (!active) return;
      if (previewError) setLoadError(previewError);
      else setPreview(data);
    });
    return () => {
      active = false;
    };
  }, [open, tenantId, plan, interval]);

  const handleConfirm = async () => {
    setWorking(true);
    setError("");
    if (pendingChange) {
      const { error: resumeError } = await resumeMembership(tenantId);
      if (resumeError) {
        setWorking(false);
        setError(resumeError);
        return;
      }
    }
    const { data, error: changeError } = await changePlan(
      tenantId,
      plan.value,
      interval,
      preview?.prorationDate
    );
    setWorking(false);

    if (changeError) {
      setError(
        pendingChange
          ? `${changeError} Your scheduled change was undone, so your current plan continues.`
          : changeError
      );
      onDone?.({ status: "error" });
      return;
    }
    if (data.status === "payment_required") {
      setError(data.error);
      setInvoiceUrl(data.invoiceUrl);
      onDone?.(data);
      return;
    }
    onDone?.(data);
    onOpenChange(false);
  };

  const credit = preview && preview.total < 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !working && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogTitle>
          Upgrade to {plan?.name} {interval === "year" ? "yearly" : "monthly"}?
        </DialogTitle>

        {!preview && !loadError && (
          <p className="text-sm text-brand-dark/70" aria-live="polite">
            Working out the price…
          </p>
        )}
        {loadError && <Alert severity="error">{loadError}</Alert>}

        {preview && (
          <div className="space-y-3 text-sm text-brand-dark/70">
            {preview.trialing ? (
              <p>
                No charge today — you&apos;re still on your free trial. When it ends you&apos;ll
                pay {pricePerInterval(plan, interval)} plus any tax.
              </p>
            ) : credit ? (
              <p>
                Nothing to pay today. Your unused time is worth more than the new plan, so{" "}
                <span className="font-medium text-brand-dark">
                  {formatCents(preview.total, preview.currency)}
                </span>{" "}
                goes to your account balance and pays your next invoices.
              </p>
            ) : (
              <>
                <p className="text-brand-dark">
                  <span className="text-2xl font-semibold tabular-nums">
                    {formatCents(preview.amountDue, preview.currency)}
                  </span>{" "}
                  due today
                </p>
                <p>
                  That&apos;s the difference for the rest of this billing period
                  {preview.tax > 0 && `, including ${formatCents(preview.tax, preview.currency)} tax`}.
                  After that it&apos;s {pricePerInterval(plan, interval)} plus any tax.
                </p>
              </>
            )}
            <p>You get {plan.name}&apos;s features as soon as the payment goes through.</p>
            {pendingChange && (
              <p className="font-medium text-brand-dark">
                This also undoes the change you scheduled, so your membership continues.
              </p>
            )}
          </div>
        )}

        {error && (
          <Alert severity="error" className="mt-4">
            {error}
          </Alert>
        )}

        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={working}>
            {invoiceUrl ? "Close" : "Cancel"}
          </Button>
          {invoiceUrl ? (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
            >
              Finish payment
            </a>
          ) : (
            <Button onClick={handleConfirm} disabled={working || !preview}>
              {working
                ? "Upgrading…"
                : preview && !preview.trialing && !credit && preview.amountDue > 0
                  ? `Pay ${formatCents(preview.amountDue, preview.currency)} and upgrade`
                  : "Upgrade"}
            </Button>
          )}
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeDialog;
