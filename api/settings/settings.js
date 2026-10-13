import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

const DEFAULT_PRICES_KEY = "default_prices";
const STUDIO_FEE_KEY = "private_lesson_studio_fee";
const TIMEZONE_KEY = "timezone";
const CHECKLIST_DISMISSED_KEY = "onboarding_checklist_dismissed";
const PERIOD_CLASSES_KEY = "new_period_classes";
const PERIOD_AUTO_CREATE_KEY = "period_auto_create";

// How a new period carries over the previous period's schedule: "advance"
// moves each class up to its next level, "same" keeps the classes as they are.
export const DEFAULT_PERIOD_CLASSES = "advance";

export const PERIOD_CLASSES_OPTIONS = [
  { value: "advance", label: "Advance each class to its next level" },
  { value: "same", label: "Keep the same classes" },
];

// IANA timezone used to decide "day-of" event pricing and other date logic.
export const DEFAULT_TIMEZONE = "America/Indiana/Indianapolis";

export const TIMEZONE_OPTIONS = [
  { value: "America/Indiana/Indianapolis", label: "Eastern - Indiana (Indianapolis)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain - No DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

// The browser's timezone when it's one we offer, so onboarding can
// pre-select it; otherwise the app default.
export const guessTimezone = () => {
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_OPTIONS.some((option) => option.value === browserTz)) return browserTz;
  } catch {}
  return DEFAULT_TIMEZONE;
};

export const getSetting = async (key) => {
  try {
    let { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data && data.length > 0 ? data[0].value : null;
  } catch (error) {
    console.error("Error retrieving setting from database", error);
    return null;
  }
};

export const upsertSetting = async (key, value) => {
  try {
    let { error } = await supabase.from("settings").upsert(
      {
        key,
        value,
        tenant_id: getActiveTenantId(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,key" }
    );
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving setting in database", error);
    return false;
  }
};

export const getDefaultPrices = async () => {
  const value = await getSetting(DEFAULT_PRICES_KEY);
  return Array.isArray(value) ? value : [];
};

export const saveDefaultPrices = async (prices) =>
  upsertSetting(DEFAULT_PRICES_KEY, prices);

export const getStudioFee = async () => {
  const value = await getSetting(STUDIO_FEE_KEY);
  const fee = Number(value);
  return isNaN(fee) ? 0 : fee;
};

export const saveStudioFee = async (fee) =>
  upsertSetting(STUDIO_FEE_KEY, Number(fee) || 0);

export const getTimezone = async () => {
  const value = await getSetting(TIMEZONE_KEY);
  return typeof value === "string" && value.trim() ? value : DEFAULT_TIMEZONE;
};

export const saveTimezone = async (timezone) =>
  upsertSetting(TIMEZONE_KEY, timezone || DEFAULT_TIMEZONE);

export const getChecklistDismissed = async () =>
  (await getSetting(CHECKLIST_DISMISSED_KEY)) === true;

export const saveChecklistDismissed = async (dismissed) =>
  upsertSetting(CHECKLIST_DISMISSED_KEY, !!dismissed);

export const getPeriodClassesMode = async () => {
  const value = await getSetting(PERIOD_CLASSES_KEY);
  return PERIOD_CLASSES_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_PERIOD_CLASSES;
};

export const savePeriodClassesMode = async (mode) =>
  upsertSetting(PERIOD_CLASSES_KEY, mode || DEFAULT_PERIOD_CLASSES);

// Automatic monthly periods (Studio and Pro Studio). Read by the hourly
// auto_create_periods() job (migration 020): on or after `day` of the
// month, in the studio's timezone, next month's period is created.
export const PERIOD_AUTO_CREATE_PLANS = ["studio", "pro studio"];

export const DEFAULT_PERIOD_AUTO_CREATE = {
  enabled: false,
  day: 25,
  name_format: "month_year",
};

// Labels match auto_period_name() in migration 020.
export const PERIOD_NAME_FORMAT_OPTIONS = [
  { value: "month_year", label: "November 2026" },
  { value: "short_month_year", label: "Nov 2026" },
  { value: "year_month", label: "2026-11" },
];

export const PERIOD_AUTO_CREATE_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

export const getPeriodAutoCreate = async () => {
  const value = await getSetting(PERIOD_AUTO_CREATE_KEY);
  return { ...DEFAULT_PERIOD_AUTO_CREATE, ...(value && typeof value === "object" ? value : {}) };
};

export const savePeriodAutoCreate = async ({ enabled, day, name_format }) =>
  upsertSetting(PERIOD_AUTO_CREATE_KEY, {
    enabled: !!enabled,
    day: Math.min(Math.max(Number(day) || DEFAULT_PERIOD_AUTO_CREATE.day, 1), 28),
    name_format: name_format || DEFAULT_PERIOD_AUTO_CREATE.name_format,
  });
