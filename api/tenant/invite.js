import supabase from "@/lib/supabase/client";

export const getInvites = async (tenantId) => {
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from("tenant_invite")
      .select("id, email, role, status, created_at, accepted_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Error retrieving invites", error);
    return [];
  }
};

export const createInvite = async (tenantId, email, role) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("tenant_invite").insert({
      tenant_id: tenantId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: user?.user?.id ?? null,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating invite", error);
    return false;
  }
};

export const revokeInvite = async (inviteId) => {
  try {
    const { error } = await supabase
      .from("tenant_invite")
      .update({ status: "revoked" })
      .eq("id", inviteId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error revoking invite", error);
    return false;
  }
};
