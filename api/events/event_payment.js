import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getEventPayments = async (eventId) => {
  try {
    let { data, error } = await supabase
      .from("event_payment")
      .select("*")
      .eq("event_id", eventId)
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving event payments from database");
  }
};

export const getEventPaymentById = async (paymentId) => {
  try {
    let { data, error } = await supabase
      .from("event_payment")
      .select("*")
      .eq("id", paymentId)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error retrieving event payment by ID from database", error);
  }
};

export const createEventPayment = async (paymentData) => {
  try {
    let { data, error } = await supabase
      .from("event_payment")
      .insert([{ ...paymentData, tenant_id: getActiveTenantId() }])
      .select();
    if (error) throw error;
    return data && data.length > 0 ? data[0] : true;
  } catch (error) {
    console.error("Error creating event payment in database");
  }
};

export const updateEventPayment = async (paymentId, paymentData) => {
  try {
    let { data, error } = await supabase
      .from("event_payment")
      .update(paymentData)
      .eq("id", paymentId);
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error updating event payment in database");
  }
};

export const getEventPaymentsInRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("event_payment")
      .select("*, event:event_id(event_name)")
      .gte("payment_date", startDate)
      .lte("payment_date", endDate)
      .eq("tenant_id", getActiveTenantId())
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving event payments in range", error);
    return [];
  }
};

export const getEventRevenueInRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("event_payment")
      .select("payment_amount")
      .gte("payment_date", startDate)
      .lte("payment_date", endDate)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data.reduce((sum, row) => sum + (row.payment_amount || 0), 0);
  } catch (error) {
    console.error("Error retrieving event revenue in range", error);
    return 0;
  }
};

export const deleteEventPayment = async (paymentId) => {
  try {
    let { error } = await supabase
      .from("event_payment")
      .delete()
      .eq("id", paymentId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting event payment from database");
  }
};
