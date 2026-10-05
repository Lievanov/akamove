import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

// notes.user_id has no foreign key to profiles, so the author's name
// can't be embedded in the select; look it up in a second query.
const withCreatedBy = async (notes) => {
  const userIds = [...new Set(notes.map((n) => n.user_id).filter(Boolean))];
  if (userIds.length === 0) return notes;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);
  if (error) {
    console.error("Error retrieving note authors from database", error);
    return notes;
  }
  const names = Object.fromEntries(
    data.map((p) => [p.id, p.full_name || p.email])
  );
  return notes.map((n) => ({ ...n, created_by: names[n.user_id] ?? null }));
};

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
    return withCreatedBy(data);
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
    return withCreatedBy(data);
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

export const getCompletedNotesCount = async () => {
  try {
    const { count, error } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", true)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("Error retrieving completed notes count from database", error);
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
