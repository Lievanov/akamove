import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getNotes = async (startPage, endPage) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .range(startPage, endPage)
      .eq("is_completed", false)
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving notes from database", error);
  }
};

export const getPreviousNotes = async (startPage, endPage) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .range(startPage, endPage)
      .eq("is_completed", true)
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving previous notes from database", error);
  }
};

export const getPendingNotesCount = async () => {
  try {
    const { count, error } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("Error retrieving pending notes count from database", error);
    return 0;
  }
};

export const createNote = async (note) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...note, tenant_id: getActiveTenantId() })
      .select();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating note in database", error);
  }
};

export const updateNote = async (id, is_completed) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .update({ is_completed: is_completed })
      .eq("id", id)
      .select();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating note in database", error);
  }
};
