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

export const createClassType = async ({ name }) => {
  try {
    let { data, error } = await supabase
      .from("class_type")
      .insert([{ name, tenant_id: getActiveTenantId() }]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating class type", error);
  }
};
