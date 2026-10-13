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
  getPeriodClassesMode,
  savePeriodClassesMode,
  DEFAULT_PERIOD_CLASSES,
  PERIOD_CLASSES_OPTIONS,
  getPeriodAutoCreate,
  savePeriodAutoCreate,
  DEFAULT_PERIOD_AUTO_CREATE,
  PERIOD_AUTO_CREATE_PLANS,
  PERIOD_AUTO_CREATE_DAY_OPTIONS,
  PERIOD_NAME_FORMAT_OPTIONS,
} from "@/api/settings/settings";
import Loading from "@/app/components/Loading";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { Alert } from "@/app/components/ui/Alert";
import { useActiveTenant } from "@/app/context/TenantContext";
import PriceListEditor from "@/app/components/ui/PriceListEditor";
import { useOnboarding, usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import SettingsTabs from "@/app/components/membership/SettingsTabs";

const ordinalSuffix = (n) =>
  n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState([]);
  const [studioFee, setStudioFee] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [periodClassesMode, setPeriodClassesMode] = useState(DEFAULT_PERIOD_CLASSES);
  const [autoCreate, setAutoCreate] = useState(DEFAULT_PERIOD_AUTO_CREATE);
  const { activeTenant } = useActiveTenant() ?? {};
  const autoCreateAllowed = PERIOD_AUTO_CREATE_PLANS.includes(activeTenant?.plan);
  const updateAutoCreate = (field, value) =>
    setAutoCreate((prev) => ({ ...prev, [field]: value }));
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
    setPeriodClassesMode(await getPeriodClassesMode());
    setAutoCreate(await getPeriodAutoCreate());
    setLoading(false);
  };

  const handleSave = async () => {
    const cleanedPrices = prices
      .map(Number)
      .filter((price) => !isNaN(price) && price > 0);

    const cleanedFee = Math.max(Number(studioFee) || 0, 0);

    setSaving(true);
    const results = await Promise.all([
      saveDefaultPrices(cleanedPrices),
      saveStudioFee(cleanedFee),
      saveTimezone(timezone),
      savePeriodClassesMode(periodClassesMode),
      savePeriodAutoCreate(autoCreate),
    ]);
    if (results.every(Boolean)) {
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
      <SettingsTabs />
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

          <div>
            <h2 className="mb-1 text-lg font-semibold text-brand-dark">
              New Period Classes
            </h2>
            <p className="mb-3 text-sm text-brand-dark/60">
              A new period copies the previous period&apos;s schedule. Choose
              whether each class moves up to its next level, so students
              continue where they left off, or stays the same — for example
              when periods are only used to track monthly payments. You can
              still switch per period.
            </p>
            <div className="max-w-sm">
              <Select
                aria-label="New period classes"
                value={periodClassesMode}
                onChange={setPeriodClassesMode}
                options={PERIOD_CLASSES_OPTIONS}
              />
            </div>
          </div>

          <hr className="my-6 border-brand-dark/10" />

          <div>
            <h2 className="mb-1 text-lg font-semibold text-brand-dark">
              Automatic Monthly Periods
            </h2>
            <p className="mb-3 text-sm text-brand-dark/60">
              Create next month&apos;s period for you, so you can take monthly
              payments without setting it up by hand. It copies the latest
              period&apos;s schedule with the same classes and its prices, and
              runs from the 1st to the last day of the month. Students still
              pick their classes each month. You&apos;ll see a notice on the
              Periods page when one is created.
            </p>
            {!autoCreateAllowed && (
              <Alert severity="warning" className="mb-3">
                Automatic periods are included in Studio and Pro Studio.{" "}
                <Link
                  href="/dashboard/settings/membership"
                  className="font-semibold underline"
                >
                  See plans
                </Link>
              </Alert>
            )}
            <Checkbox
              label="Create next month's period automatically"
              checked={autoCreateAllowed && autoCreate.enabled}
              onCheckedChange={(checked) => updateAutoCreate("enabled", !!checked)}
              disabled={!autoCreateAllowed}
            />
            {autoCreateAllowed && autoCreate.enabled && (
              <div className="mt-4 grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Create it on day"
                  value={String(autoCreate.day)}
                  onChange={(v) => updateAutoCreate("day", Number(v))}
                  options={PERIOD_AUTO_CREATE_DAY_OPTIONS}
                />
                <Select
                  label="Name it like"
                  value={autoCreate.name_format}
                  onChange={(v) => updateAutoCreate("name_format", v)}
                  options={PERIOD_NAME_FORMAT_OPTIONS}
                />
                <p className="text-xs text-brand-dark/50 sm:col-span-2">
                  On the {autoCreate.day}
                  {ordinalSuffix(autoCreate.day)} of each month, in the
                  studio&apos;s timezone below, next month&apos;s period is
                  created. Day 28 is the latest, so it runs every month.
                </p>
              </div>
            )}
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
