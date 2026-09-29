import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getLocations = async (startPage, endPage) => {
  try {
    const { data, error } = await supabase
      .from("location")
      .select("*")
      .range(startPage, endPage)
      .eq("tenant_id", getActiveTenantId())
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving locations from database");
  }
};

export const getLocationCount = async () => {
  try {
    const { count, error } = await supabase
      .from("location")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving location count from database");
  }
};

export const getLocationById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("location")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId())
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving location by id from database");
  }
};

export const createLocation = async ({ name, address, phone, capacity, is_active, notes }) => {
  try {
    const { error } = await supabase.from("location").insert({
      name,
      address,
      phone: phone || null,
      capacity: capacity ? Number(capacity) : null,
      is_active,
      notes: notes || null,
      tenant_id: getActiveTenantId(),
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating location in database", JSON.stringify(error));
    return false;
  }
};

export const updateLocation = async ({ id, name, address, phone, capacity, is_active, notes }) => {
  try {
    const { error } = await supabase
      .from("location")
      .update({
        name,
        address,
        phone: phone || null,
        capacity: capacity ? Number(capacity) : null,
        is_active,
        notes: notes || null,
      })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating location in database", JSON.stringify(error));
    return false;
  }
};

export const deleteLocation = async (id) => {
  try {
    const { error } = await supabase.from("location").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting location in database", JSON.stringify(error));
    return false;
  }
};

export const getAllLocations = async () => {
  try {
    const { data, error } = await supabase
      .from("location")
      .select("id, name")
      .eq("is_active", true)
      .eq("tenant_id", getActiveTenantId())
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving all locations from database");
  }
};
