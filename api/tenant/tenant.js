import supabase from "@/lib/supabase/client";

// A trial past its end date is Starter even before the hourly
// expire_due_trials() job (migration 011) catches up — derive that
// here so the whole app sees one consistent answer.
const withEffectiveTrial = (tenant) => {
  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
  const pastDue =
    tenant.trial_status === "active" && trialEndsAt && trialEndsAt <= new Date();
  return {
    plan: pastDue ? "starter" : tenant.plan,
    trialStatus: pastDue ? "expired" : tenant.trial_status,
    trialEndsAt,
    trialCode: tenant.trial_code,
  };
};

// RPCs raise these as bare messages; map them to copy users can act on.
const TRIAL_ERROR_MESSAGES = {
  trial_already_used: "You've already used your free trial — pick a plan to continue.",
  invalid_trial_code: "That code isn't valid or has expired.",
  trial_code_already_applied: "A code has already been applied to this studio.",
  trial_code_too_short: "That code wouldn't extend your trial past today.",
  no_trial: "This studio isn't on a trial.",
  not_a_downgrade: "That plan isn't lower than your current one. Upgrades open once online billing is live.",
  invalid_plan: "That plan doesn't exist.",
  not_tenant_admin: "Only studio admins can change the plan.",
};

const trialErrorMessage = (error, fallback) =>
  TRIAL_ERROR_MESSAGES[error?.message] ?? fallback;

export const getUserTenants = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("user_tenant")
      .select(
        "role, tenant:tenant_id(id, name, plan, trial_status, trial_ends_at, trial_code)"
      )
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? [])
      .filter((row) => row.tenant)
      .map((row) => ({
        id: row.tenant.id,
        name: row.tenant.name,
        ...withEffectiveTrial(row.tenant),
        role: row.role,
      }));
  } catch (error) {
    console.error("Error retrieving user tenants", error);
    return [];
  }
};

// Returns { tenant, error } — error is user-facing copy, since trial
// signups can fail for reasons the user can fix (bad code, trial used).
export const createTenantAndBecomeAdmin = async (
  name,
  { plan = "starter", trial = false, trialCode = null } = {}
) => {
  try {
    const { data, error } = await supabase.rpc("create_tenant_and_admin", {
      p_name: name,
      p_plan: plan,
      p_trial: trial,
      p_trial_code: trialCode || null,
    });
    if (error) throw error;
    return { tenant: data, error: null };
  } catch (error) {
    console.error("Error creating tenant", error);
    return {
      tenant: null,
      error: trialErrorMessage(error, "Failed to create your studio, please try again."),
    };
  }
};

export const hasUsedTrial = async (userId) => {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from("trial_usage")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("Error checking trial usage", error);
    return false;
  }
};

export const redeemTrialCode = async (tenantId, code) => {
  try {
    const { data, error } = await supabase.rpc("redeem_trial_code", {
      p_tenant_id: tenantId,
      p_code: code,
    });
    if (error) throw error;
    return { tenant: data, error: null };
  } catch (error) {
    console.error("Error redeeming trial code", error);
    return {
      tenant: null,
      error: trialErrorMessage(error, "Couldn't apply that code, please try again."),
    };
  }
};

// Moves the studio to a lower plan (Settings → Membership). Returns
// { tenant, error } with user-facing copy, like the trial RPCs.
export const downgradeTenantPlan = async (tenantId, plan) => {
  try {
    const { data, error } = await supabase.rpc("downgrade_tenant_plan", {
      p_tenant_id: tenantId,
      p_plan: plan,
    });
    if (error) throw error;
    return { tenant: data, error: null };
  } catch (error) {
    console.error("Error changing plan", error);
    return {
      tenant: null,
      error: trialErrorMessage(
        error,
        "Couldn't change your plan. Check your connection and try again."
      ),
    };
  }
};

// Staff members of a studio — admins can read every membership row in
// their own studio (user_tenant RLS, migration 001).
export const getStaffCount = async (tenantId) => {
  if (!tenantId) return 0;
  try {
    const { count, error } = await supabase
      .from("user_tenant")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role", "staff");
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("Error counting staff", error);
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
