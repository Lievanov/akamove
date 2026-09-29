import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getInstructors = async (startPage, endPage) => {
  try {
    const { data, error } = await supabase
      .from("instructors")
      .select("*")
      .range(startPage, endPage)
      .eq("tenant_id", getActiveTenantId())
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving instructors from database");
  }
};

export const getInstructorCount = async () => {
  try {
    const { count, error } = await supabase
      .from("instructors")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving instructor count from database");
  }
};

export const getInstructorById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("instructors")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId())
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving instructor by id from database");
  }
};

export const createInstructor = async ({ name }) => {
  try {
    const { error } = await supabase
      .from("instructors")
      .insert({ name, tenant_id: getActiveTenantId() });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating instructor in database", JSON.stringify(error));
    return false;
  }
};

export const updateInstructor = async ({ id, name }) => {
  try {
    const { error } = await supabase
      .from("instructors")
      .update({ name })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating instructor in database", JSON.stringify(error));
    return false;
  }
};

export const getAllInstructors = async () => {
  try {
    const { data, error } = await supabase
      .from("instructors")
      .select("id, name")
      .eq("tenant_id", getActiveTenantId())
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving all instructors from database");
  }
};

export const deleteInstructor = async (id) => {
  try {
    const { error } = await supabase.from("instructors").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting instructor from database", JSON.stringify(error));
    return false;
  }
};
