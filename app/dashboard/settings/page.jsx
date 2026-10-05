"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDefaultPrices,
  saveDefaultPrices,
  getStudioFee,
  saveStudioFee,
  getTimezone,
  saveTimezone,
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
} from "@/api/settings/settings";
import Loading from "@/app/components/Loading";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import PriceListEditor from "@/app/components/ui/PriceListEditor";
import { useOnboarding, usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState([]);
  const [studioFee, setStudioFee] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const refreshSetup = useOnboarding()?.refreshSetup;
  usePageTour(TOURS.settings, { ready: !loading });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setPrices(await getDefaultPrices());
    setStudioFee(String(await getStudioFee()));
    setTimezone(await getTimezone());
    setLoading(false);
  };

  const handleSave = async () => {
    const cleanedPrices = prices
      .map(Number)
      .filter((price) => !isNaN(price) && price > 0);

    const cleanedFee = Math.max(Number(studioFee) || 0, 0);

    setSaving(true);
    const [pricesOk, feeOk, timezoneOk] = await Promise.all([
      saveDefaultPrices(cleanedPrices),
      saveStudioFee(cleanedFee),
      saveTimezone(timezone),
    ]);
    if (pricesOk && feeOk && timezoneOk) {
      setPrices(cleanedPrices);
      setStudioFee(String(cleanedFee));
      setAlert({ text: "Settings saved.", severity: "success" });
      refreshSetup?.();
    } else {
      setAlert({
        text: "Couldn't save settings. Check your connection and try again.",
        severity: "error",
      });
    }
    setSaving(false);
  };

  if (loading) return <Loading variant="form-page" />;

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          duration={5000}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader
        title="Settings"
        actions={
          <Link
            href="/dashboard/settings/team"
            data-tour="settings-team"
            className={buttonVariants({ variant: "outline" })}
          >
            Manage team
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl px-4 pb-8">
        <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
          <div data-tour="settings-prices">
            <h2 className="mb-1 text-lg font-semibold text-brand-dark">
              Default Pricing
            </h2>
            <p className="mb-3 text-sm text-brand-dark/60">
              The price options students can pay for a period — for example
              one class, two classes, or unlimited. They&apos;re pre-filled
              on every new period, and you can still adjust them per period.
            </p>
            <PriceListEditor
              prices={prices}
              onChange={setPrices}
              emptyText="No default prices yet — add at least one so new periods start with pricing."
            />
          </div>

          <hr className="my-6 border-brand-dark/10" />

          <div data-tour="settings-fee">
            <h2 className="mb-1 text-lg font-semibold text-brand-dark">
              Private Lesson Studio Fee
            </h2>
            <p className="mb-3 text-sm text-brand-dark/60">
              Amount the studio keeps per private lesson class. It is deducted
              from each instructor&apos;s per-class pay in the private lesson
              reports.
            </p>
            <div className="max-w-xs">
              <Input
                aria-label="Private lesson studio fee"
                type="number"
                value={studioFee}
                onChange={(e) => setStudioFee(e.target.value)}
                step="0.01"
                min="0"
                prefix="$"
              />
            </div>
          </div>

          <hr className="my-6 border-brand-dark/10" />

          <div data-tour="settings-timezone">
            <h2 className="mb-1 text-lg font-semibold text-brand-dark">
              Timezone
            </h2>
            <p className="mb-3 text-sm text-brand-dark/60">
              Used to decide event pricing. When a payment is taken on the day
              of an event, the &quot;Date of Event Price&quot; is charged;
              otherwise the regular &quot;Event Price&quot; applies. Set this to
              the studio&apos;s local timezone.
            </p>
            <div className="max-w-sm">
              <Select
                value={timezone}
                onChange={setTimezone}
                options={TIMEZONE_OPTIONS}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
