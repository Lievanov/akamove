import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getCreditBalanceByStudentId = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from("user_credit_balances")
      .select("total_credit")
      .eq("student_id", studentId)
      .eq("tenant_id", getActiveTenantId())
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data?.total_credit ?? 0;
  } catch (error) {
    console.error(
      "Error retrieving credit balance by student ID from database",
      error
    );
    return 0;
  }
};

// NOTE (Phase 5 sweep): handle_create_credit / handle_update_credit are
// database functions with no source captured anywhere in this repo
// (not in api/db.sql, api/db_export.sql, or api/db/migrations/) — they
// exist only in the live DB. They likely write to `payment`
// (is_credit = true rows) and/or `user_credit_balances`, both of which
// now have a tenant_id column and, after the RLS cutover, RLS policies
// that require it. Pull their definitions from the Supabase SQL editor
// (pg_get_functiondef) and update them to set tenant_id on any insert
// before the cutover in 008, or credit creation/update will start
// failing silently for staff.
export const createCredit = async ({ student_id, amount }) => {
  try {
    const { error } = await supabase.rpc("handle_create_credit", {
      p_student_id: student_id,
      p_amount: amount,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating credit in database", error);
    return false;
  }
};

export const updateCredit = async ({ id, student_id, amount }) => {
  try {
    const { error } = await supabase.rpc("handle_update_credit", {
      p_id: id,
      p_student_id: student_id,
      p_new_amount: amount,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating credit in database", error);
    return false;
  }
};
