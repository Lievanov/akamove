import supabase from "@/lib/supabase/client";

// Server routes only: every user's token, which profiles RLS (migration
// 021) hides from the browser client — pass the service-role client.
export const getPushTokens = async (client) => {
  try {
    const { data, error } = await client
      .from("profiles")
      .select("push_token")
      .not("push_token", "is", null);
    if (error) throw error;
    return (data ?? []).map(({ push_token }) => push_token);
  } catch (error) {
    console.error("Error retrieving push tokens", error);
    return [];
  }
};

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
