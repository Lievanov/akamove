import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

const DEFAULT_PRICES_KEY = "default_prices";
const STUDIO_FEE_KEY = "private_lesson_studio_fee";
const TIMEZONE_KEY = "timezone";

// IANA timezone used to decide "day-of" event pricing and other date logic.
export const DEFAULT_TIMEZONE = "America/Indiana/Indianapolis";

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
