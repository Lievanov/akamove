"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import {
  getDefaultPrices,
  saveDefaultPrices,
  getStudioFee,
  saveStudioFee,
  getTimezone,
  saveTimezone,
  DEFAULT_TIMEZONE,
} from "@/api/settings/settings";
import Loading from "@/app/components/Loading";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import PriceListEditor from "@/app/components/ui/PriceListEditor";

const TIMEZONE_OPTIONS = [
  { value: "America/Indiana/Indianapolis", label: "Eastern - Indiana (Indianapolis)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain - No DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

function Settings() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState([]);
  const [studioFee, setStudioFee] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const { activeTenant, tenantsLoading } = useActiveTenant();

  useEffect(() => {
    let isActive = true;
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.replace("/");
        return;
      }

      if (tenantsLoading) return;

      const role = await getUserRoleForTenant(user.id, activeTenant?.id);
      if (role !== "admin") {
        router.replace("/dashboard/access-denined");
        return;
      }

      if (isActive) setCheckingAccess(false);
    };

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [router, activeTenant?.id, tenantsLoading]);

  useEffect(() => {
    if (checkingAccess) return;
    loadSettings();
  }, [checkingAccess]);

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
      setAlert({ text: "Settings saved successfully!", severity: "success" });
    } else {
      setAlert({
        text: "Failed to save settings, please contact web admin!",
        severity: "error",
      });
    }
    setSaving(false);
  };

  if (checkingAccess || loading) return <Loading />;

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
      <PageHeader title="Settings" />
      <div className="mx-auto max-w-2xl px-4 pb-8">
        <div className="my-6 rounded-lg border border-brand-dark/10 p-6 md:my-10 md:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-brand-dark">Settings</h1>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/settings/team")}
            >
              Manage Team
            </Button>
          </div>
          <hr className="my-4 border-brand-dark/10" />

          <h2 className="mb-1 text-lg font-semibold text-brand-dark">
            Default Pricing
          </h2>
          <p className="mb-3 text-sm text-brand-dark/60">
            These prices are pre-filled automatically when creating a new
            period. You can still adjust them on each period.
          </p>
          <PriceListEditor
            prices={prices}
            onChange={setPrices}
            emptyText="No default prices set yet."
          />

          <hr className="my-6 border-brand-dark/10" />

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
              type="number"
              value={studioFee}
              onChange={(e) => setStudioFee(e.target.value)}
              step="0.01"
              min="0"
              prefix="$"
            />
          </div>

          <hr className="my-6 border-brand-dark/10" />

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
