import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";
import { ilikeAny } from "@/lib/supabase/filters";

export const getEvents = async (startPage, endPage, searchTerm = "") => {
  try {
    let query = supabase
      .from("events")
      .select(`*`)
      .range(startPage, endPage)
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false });

    if (searchTerm.trim() !== "") {
      query = query.or(ilikeAny(["event_name"], searchTerm));
    }

    let { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving events from database");
  }
};

export const getEventCountFiltered = async (searchTerm = "") => {
  try {
    let query = supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", getActiveTenantId());

    if (searchTerm.trim() !== "") {
      query = query.or(ilikeAny(["event_name"], searchTerm));
    }

    let { count, error } = await query;
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving event count from database");
  }
};

export const getEventById = async (eventId) => {
  try {
    let { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error retrieving event by ID from database", error);
  }
};

export const createEvent = async (eventData) => {
  try {
    let { data, error } = await supabase
      .from("events")
      .insert([{ ...eventData, tenant_id: getActiveTenantId() }])
      .select();
    if (error) throw error;
    return data && data.length > 0 ? data[0] : true;
  } catch (error) {
    console.error("Error creating event in database", error);
    return false;
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    let { data, error } = await supabase
      .from("events")
      .update(eventData)
      .eq("id", eventId)
      .select();
    if (error) throw error;
    return data && data.length > 0 ? data[0] : true;
  } catch (error) {
    console.error("Error updating event in database", error);
    return false;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    let { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting event from database");
  }
};

export const getUpcomingEvents = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    let { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", today)
      .eq("tenant_id", getActiveTenantId())
      .order("event_date", { ascending: true });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving upcoming events from database");
  }
};
