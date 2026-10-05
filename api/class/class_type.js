import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getClassTypeList = async () => {
  try {
    let { data, error } = await supabase
      .from("class_type")
      .select("*")
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving class types from database");
  }
};

// Class type names are unique per studio, ignoring case and outer
// spaces (migration 013). Use this to check before creating one.
export const normalizeClassTypeName = (name) => (name ?? "").trim().toLowerCase();

// Returns { ok, error } — error is user-facing copy.
export const createClassType = async ({ name }) => {
  try {
    const { error } = await supabase
      .from("class_type")
      .insert([{ name: name.trim(), tenant_id: getActiveTenantId() }]);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (error) {
    console.error("Error creating class type", error);
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? `A class type named “${name.trim()}” already exists.`
          : "Error saving class type",
    };
  }
};
