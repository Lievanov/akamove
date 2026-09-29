import supabase from "@/lib/supabase/client";
import { updateStudentCredit, updateStudentNotes } from "../student/students";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getPaymentsPerPeriod = async (period_id) => {
  try {
    let { data, error } = await supabase
      .from("payment")
      .select("*")
      .eq("period_id", period_id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving payments from database");
  }
};

export const getPayments = async (startPage, endPage, searchTerm) => {
  try {
    let { data, error } = await supabase
      .from("filtered_payment_view")
      .select(`*`)
      .range(startPage, endPage)
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,payment_method.ilike.%${searchTerm}%`
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving payments from database");
  }
};

export const getPaymentCount = async () => {
  try {
    let { count, error } = await supabase
      .from("filtered_payment_view")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving payment count from database");
  }
};

export const getPaymentById = async (id) => {
  try {
    let { data, error } = await supabase
      .from("payment")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error retrieving payment from database");
  }
};

export const getPaymentCountFiltered = async (searchTerm) => {
  try {
    let { count, error } = await supabase
      .from("filtered_payment_view")
      .select("*", {
        count: "exact",
        head: true,
      })
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,payment_method.ilike.%${searchTerm}%`
      );
    if (error) throw error;
    return count;
  } catch (error) {
    console.error(
      "Error retrieving payment count from database",
      JSON.stringify(error)
    );
  }
};

export const getPaymentsByStudentId = async (student_id) => {
  try {
    let { data, error } = await supabase
      .from("payment_by_student_view")
      .select("*")
      .eq("student_id", student_id)
      .limit(10);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving payment from database");
  }
};

export const createPayment = async ({
  payment_method,
  payment_amount,
  period_id,
  student_id,
  classes,
  notes,
  is_dropout,
  credit,
}) => {
  try {
    let { data, error } = await supabase.from("payment").insert([
      {
        payment_method,
        payment_amount,
        period_id,
        student_id,
        classes,
        is_dropout,
        tenant_id: getActiveTenantId(),
      },
    ]);
    if (error) throw error;
    
    // Update student credit if provided
    if (credit !== undefined && credit !== null && credit !== '') {
      await updateStudentCredit(student_id, parseFloat(credit));
    }
    
    // Update student notes if provided
    if (notes !== undefined && notes !== null && notes !== '') {
      await updateStudentNotes(student_id, notes);
    }
    
    return true;
  } catch (error) {
    console.error("Error creating payment in database", JSON.stringify(error));
  }
};

export const editPayment = async ({
  id,
  period_id,
  payment_method,
  payment_amount,
  classes,
  notes,
  is_dropout,
  credit,
}) => {
  try {
    // First get the payment to find the student_id
    const { data: paymentData, error: paymentError } = await supabase
      .from("payment")
      .select("student_id")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId())
      .single();
    
    if (paymentError) throw paymentError;
    
    let { data, error } = await supabase
      .from("payment")
      .update({
        period_id,
        payment_method,
        payment_amount,
        classes,
        is_dropout,
      })
      .eq("id", id)
      .select();
    if (error) throw error;
    
    // Update student credit if provided
    if (credit !== undefined && credit !== null && credit !== '') {
      await updateStudentCredit(paymentData.student_id, parseFloat(credit));
    }
    
    // Update student notes if provided
    if (notes !== undefined && notes !== null && notes !== '') {
      await updateStudentNotes(paymentData.student_id, notes);
    }
    
    return true;
  } catch (error) {
    console.error("Error updating payment in database", JSON.stringify(error));
  }
};

export const getPaymentAmountsForStudentsInPeriod = async (studentIds, periodId) => {
  try {
    let query = supabase
      .from("payment")
      .select("student_id, classes, payment_amount")
      .in("student_id", studentIds)
      .eq("tenant_id", getActiveTenantId());

    if (periodId) {
      query = query.eq("period_id", periodId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const amountMap = {};
    data.forEach((payment) => {
      if (!payment.classes?.length || !payment.payment_amount) return;
      const amountPerClass = payment.payment_amount / payment.classes.length;
      payment.classes.forEach((classId) => {
        const key = `${payment.student_id}_${classId}`;
        amountMap[key] = (amountMap[key] || 0) + amountPerClass;
      });
    });

    return amountMap;
  } catch (error) {
    console.error("Error retrieving payment amounts for students", error);
    return {};
  }
};

export const getTotalIncomePerPeriod = async (periodId) => {
  try {
    let { data, error } = await supabase
      .from("payment")
      .select("payment_amount")
      .eq("period_id", periodId)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data.reduce((acc, curr) => acc + curr.payment_amount, 0);
  } catch (error) {
    console.error("Error retrieving total income per period from database");
  }
};
