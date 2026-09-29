import supabase from "@/lib/supabase/client";

export const getPushTokens = async () => {
  try {
    const { data, error } = await supabase
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
