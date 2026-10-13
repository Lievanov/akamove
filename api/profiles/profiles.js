import supabase from "@/lib/supabase/client";

export const getProfileRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data?.role ?? null;
  } catch (error) {
    console.error("Error retrieving profile role", error);
    return null;
  }
};

// Ids of the dashboard page tours this user has finished or skipped
// (migration 012). Returns null when it can't be read, so callers can
// tell "never seen anything" apart from "don't know".
export const getToursSeen = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("tours_seen")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return Array.isArray(data?.tours_seen) ? data.tours_seen : [];
  } catch (error) {
    console.error("Error retrieving tours seen", error);
    return null;
  }
};

export const saveToursSeen = async (userId, toursSeen) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ tours_seen: toursSeen })
      .eq("id", userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving tours seen", error);
    return false;
  }
};
