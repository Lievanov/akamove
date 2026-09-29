import supabase from "@/lib/supabase/client";

export const getUserTenants = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("user_tenant")
      .select("role, tenant:tenant_id(id, name, plan)")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? [])
      .filter((row) => row.tenant)
      .map((row) => ({
        id: row.tenant.id,
        name: row.tenant.name,
        plan: row.tenant.plan,
        role: row.role,
      }));
  } catch (error) {
    console.error("Error retrieving user tenants", error);
    return [];
  }
};

export const createTenantAndBecomeAdmin = async (name, plan) => {
  try {
    const { data, error } = await supabase.rpc("create_tenant_and_admin", {
      p_name: name,
      p_plan: plan,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating tenant", error);
    return null;
  }
};

export const acceptPendingInvites = async () => {
  try {
    const { data, error } = await supabase.rpc("accept_pending_invites");
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Error accepting pending invites", error);
    return [];
  }
};

export const getUserRoleForTenant = async (userId, tenantId) => {
  if (!userId || !tenantId) return null;
  try {
    const { data, error } = await supabase
      .from("user_tenant")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .single();
    if (error) throw error;
    return data?.role ?? null;
  } catch (error) {
    console.error("Error retrieving user role for tenant", error);
    return null;
  }
};
