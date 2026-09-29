import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getScheduleByPeriod = async (periodId) => {
  try {
    const { data, error } = await supabase
      .from("period_location_class")
      .select("*")
      .eq("period_id", periodId)
      .eq("tenant_id", getActiveTenantId())
      .order("location_id")
      .order("sort_order");
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving schedule by period from database");
    return [];
  }
};

export const upsertScheduleForPeriod = async (periodId, slots) => {
  try {
    const { error: deleteError } = await supabase
      .from("period_location_class")
      .delete()
      .eq("period_id", periodId);
    if (deleteError) throw deleteError;

    if (!slots.length) return true;

    const { error: insertError } = await supabase
      .from("period_location_class")
      .insert(
        slots.map((s) => ({
          period_id: periodId,
          ...s,
          tenant_id: getActiveTenantId(),
        }))
      );
    if (insertError) throw insertError;

    return true;
  } catch (error) {
    console.error("Error upserting schedule for period", JSON.stringify(error));
    return false;
  }
};
