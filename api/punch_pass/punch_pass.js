import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

// Punch passes (migration 019): a student buys N entries and each class
// they attend is recorded as an entry against the pass. Remaining entries
// are always total_entries minus the entries recorded, never a stored count.

const PUNCH_ERROR_MESSAGES = {
  no_active_pass:
    "This student has no pass with entries left. Sell a new pass or extend an expired one.",
  student_not_found: "Couldn't find this student.",
  invalid_class: "That class isn't part of this studio.",
  invalid_location: "That location isn't part of this studio.",
  entries_below_used:
    "Entries can't be lower than the number of entries already used.",
};

const punchErrorMessage = (error, fallback) =>
  PUNCH_ERROR_MESSAGES[error?.message] ?? fallback;

// --- Pure helpers ------------------------------------------------------

export const entriesUsed = (pass) => pass?.entries?.length ?? 0;

export const entriesRemaining = (pass) =>
  Math.max((pass?.total_entries ?? 0) - entriesUsed(pass), 0);

// "active" | "used_up" | "expired". `today` is "YYYY-MM-DD" in the
// studio's timezone (getTodayInTimezone). Used up wins over expired, since
// extending a used-up pass wouldn't help.
export const passStatus = (pass, today) => {
  if (entriesRemaining(pass) === 0) return "used_up";
  if (pass.expires_on && pass.expires_on < today) return "expired";
  return "active";
};

// The pass the next punch will use — same order as record_punch(): the
// oldest active pass, so a newly bought pass waits until earlier ones run out.
export const nextPassToUse = (passes = [], today) =>
  passes
    .filter((pass) => passStatus(pass, today) === "active")
    .sort(
      (a, b) =>
        a.purchased_on.localeCompare(b.purchased_on) ||
        a.created_at.localeCompare(b.created_at)
    )[0] ?? null;

// purchased_on + validity_days, as "YYYY-MM-DD" (or null for no expiry).
export const expiryFromValidity = (purchasedOn, validityDays) => {
  const days = Number(validityDays);
  if (!purchasedOn || !days) return null;
  const [y, m, d] = purchasedOn.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split("T")[0];
};

// --- Pass types (Settings → Punch passes) ------------------------------

export const getPassTypes = async ({ activeOnly = false } = {}) => {
  try {
    let query = supabase
      .from("punch_pass_type")
      .select("*")
      .eq("tenant_id", getActiveTenantId())
      .order("total_entries", { ascending: true });
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Error retrieving punch pass types", error);
    return undefined;
  }
};

export const savePassType = async ({
  id,
  name,
  total_entries,
  price,
  validity_days,
  is_active = true,
}) => {
  const values = {
    name: name.trim(),
    total_entries,
    price,
    validity_days: validity_days || null,
    is_active,
  };
  try {
    const { error } = id
      ? await supabase
          .from("punch_pass_type")
          .update(values)
          .eq("id", id)
          .eq("tenant_id", getActiveTenantId())
      : await supabase
          .from("punch_pass_type")
          .insert({ ...values, tenant_id: getActiveTenantId() });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving punch pass type", error);
    return false;
  }
};

// Passes already sold keep their own copy of the type's name, entries and
// price, so deleting a type never changes them.
export const deletePassType = async (id) => {
  try {
    const { error } = await supabase
      .from("punch_pass_type")
      .delete()
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting punch pass type", error);
    return false;
  }
};

// --- Passes ------------------------------------------------------------

const PASS_SELECT = `*,
  entries:punch_pass_entry(id, used_at, notes, class_id, location_id,
    class:class_id(name, level),
    location:location_id(name),
    recorder:recorded_by(full_name))`;

const sortEntries = (pass) => ({
  ...pass,
  entries: [...(pass.entries ?? [])].sort((a, b) =>
    b.used_at.localeCompare(a.used_at)
  ),
});

export const getPassesByStudent = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from("punch_pass")
      .select(PASS_SELECT)
      .eq("student_id", studentId)
      .eq("tenant_id", getActiveTenantId())
      .order("purchased_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(sortEntries);
  } catch (error) {
    console.error("Error retrieving punch passes", error);
    return undefined;
  }
};

export const sellPass = async ({
  student_id,
  pass_type_id,
  name,
  total_entries,
  price,
  payment_method,
  purchased_on,
  expires_on,
  notes,
}) => {
  try {
    const { error } = await supabase.from("punch_pass").insert({
      student_id,
      pass_type_id: pass_type_id || null,
      name: name.trim(),
      total_entries,
      price,
      payment_method,
      purchased_on,
      expires_on: expires_on || null,
      notes: notes?.trim() || null,
      tenant_id: getActiveTenantId(),
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error selling punch pass", error);
    return {
      error: "Couldn't sell the pass. Check your connection and try again.",
    };
  }
};

export const updatePass = async (
  id,
  { name, total_entries, price, payment_method, purchased_on, expires_on, notes }
) => {
  try {
    const { error } = await supabase
      .from("punch_pass")
      .update({
        name: name.trim(),
        total_entries,
        price,
        payment_method,
        purchased_on,
        expires_on: expires_on || null,
        notes: notes?.trim() || null,
      })
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error updating punch pass", error);
    return {
      error: punchErrorMessage(
        error,
        "Couldn't update the pass. Check your connection and try again."
      ),
    };
  }
};

export const deletePass = async (id) => {
  try {
    const { error } = await supabase
      .from("punch_pass")
      .delete()
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting punch pass", error);
    return false;
  }
};

// --- Entries (punches) -------------------------------------------------

// The database picks which pass to punch (see record_punch in 019).
export const recordPunch = async ({
  studentId,
  usedAt,
  classId,
  locationId,
  notes,
}) => {
  try {
    const { data, error } = await supabase.rpc("record_punch", {
      p_student_id: studentId,
      p_used_at: usedAt,
      p_class_id: classId || null,
      p_location_id: locationId || null,
      p_notes: notes || null,
    });
    if (error) throw error;
    return { entry: data, error: null };
  } catch (error) {
    console.error("Error recording punch", error);
    return {
      entry: null,
      error: punchErrorMessage(
        error,
        "Couldn't record the entry. Check your connection and try again."
      ),
    };
  }
};

export const updatePunch = async (id, { usedAt, classId, locationId, notes }) => {
  try {
    const { error } = await supabase
      .from("punch_pass_entry")
      .update({
        used_at: usedAt,
        class_id: classId || null,
        location_id: locationId || null,
        notes: notes?.trim() || null,
      })
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating punch", error);
    return false;
  }
};

// Undo: the entry goes back on the pass it was taken from.
export const deletePunch = async (id) => {
  try {
    const { error } = await supabase
      .from("punch_pass_entry")
      .delete()
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting punch", error);
    return false;
  }
};

// --- Reports -----------------------------------------------------------

export const getPassSalesInRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("punch_pass")
      .select(
        "id, name, total_entries, price, payment_method, purchased_on, student:student_id(first_name, last_name)"
      )
      .gte("purchased_on", startDate)
      .lte("purchased_on", endDate)
      .eq("tenant_id", getActiveTenantId())
      .order("purchased_on", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Error retrieving punch pass sales in range", error);
    return [];
  }
};

export const getPassRevenueInRange = async (startDate, endDate) => {
  const sales = await getPassSalesInRange(startDate, endDate);
  return sales.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
};
