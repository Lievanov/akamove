import supabase from "@/lib/supabase/client";
import { getPrivateLessonRevenueInRange } from "../private_lesson/private_lesson";
import { getEventRevenueInRange } from "../events/event_payment";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

const notifyPeriodCreated = async (period) => {
  try {
    await fetch("/api/notifications/period", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(period),
    });
  } catch (error) {
    console.error("Error sending period push notifications", error);
  }
};

export const getLatestPeriod = async () => {
  try {
    let { data, error } = await supabase
      .from("period")
      .select("*")
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error retrieving current period from database");
  }
};

export const getLastestThreePeriods = async () => {
  try {
    let { data, error } = await supabase
      .from("period")
      .select("*")
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving last three periods from database");
  }
};

export const getPeriods = async (startPage, endPage) => {
  try {
    let { data, error } = await supabase
      .from("period")
      .select(`*`)
      .range(startPage, endPage)
      .eq("tenant_id", getActiveTenantId())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving periods from database");
  }
};

export const getPeriodById = async (periodId) => {
  try {
    let { data, error } = await supabase
      .from("period")
      .select("*")
      .eq("id", periodId)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error retrieving period by ID from database", error);
  }
};

export const getPeriodCount = async () => {
  try {
    let { count, error } = await supabase
      .from("period")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving period count from database");
  }
};

export const createPeriod = async ({ start_date, end_date, prices, name }) => {
  try {
    let { data, error } = await supabase
      .from("period")
      .insert([{ start_date, end_date, prices, name, tenant_id: getActiveTenantId() }])
      .select("id")
      .single();
    if (error) throw error;
    await notifyPeriodCreated({ id: data.id, name });
    return data.id;
  } catch (error) {
    console.error("Error creating period in database");
    return null;
  }
};

export const updatePeriod = async ({ id, start_date, end_date, prices, name }) => {
  try {
    let { data, error } = await supabase
      .from("period")
      .update({ start_date, end_date, prices, name })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating period in database");
  }
};

export const studentCountByPeriod = async (periodId) => {
  try {
    let { data, error } = await supabase
      .from("student_count_by_period_id")
      .select("*")
      .eq("period_id", periodId);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving student count by period from database");
  }
};

export const classByPeriodPerStudentCount = async (periodId) => {
  try {
    let { data, error } = await supabase
      .from("class_period_student_count")
      .select("*")
      .order("student_count", { ascending: false })
      .eq("period_id", periodId);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      "Error retrieving class by period per student count from database"
    );
  }
};

export const classByPeriodWithCorrectRevenue = async (periodId) => {
  try {
    // Get all payments for the period with class information
    let { data: payments, error: paymentsError } = await supabase
      .from("payment")
      .select("payment_amount, classes")
      .eq("period_id", periodId)
      .eq("tenant_id", getActiveTenantId());

    if (paymentsError) throw paymentsError;

    // Get class information for the period
    let { data: classData, error: classError } = await supabase
      .from("class_period_student_count")
      .select("*")
      .eq("period_id", periodId);

    if (classError) throw classError;

    // Split each payment evenly across the classes it covers
    const revenueByClass = {};

    payments.forEach(payment => {
      if (payment.classes && payment.classes.length > 0) {
        const revenuePerClass = payment.payment_amount / payment.classes.length;

        payment.classes.forEach(classId => {
          if (!revenueByClass[classId]) {
            revenueByClass[classId] = 0;
          }
          revenueByClass[classId] += revenuePerClass;
        });
      }
    });

    // Merge revenue data with class data
    const result = classData.map(classItem => ({
      ...classItem,
      total_payment: revenueByClass[classItem.class_id] || 0,
    }));

    return result;
  } catch (error) {
    console.error(
      "Error retrieving class by period with correct revenue from database",
      error
    );
  }
};

export const getClassesRevenueForPeriod = async (periodId) => {
  try {
    let { data, error } = await supabase
      .from("payment")
      .select("payment_amount, classes")
      .eq("period_id", periodId)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data
      .filter((payment) => payment.classes && payment.classes.length > 0)
      .reduce((sum, payment) => sum + (payment.payment_amount || 0), 0);
  } catch (error) {
    console.error("Error retrieving classes revenue for period", error);
    return 0;
  }
};

export const getPeriodRevenueSummary = async (periodId) => {
  try {
    const period = await getPeriodById(periodId);
    if (!period) throw new Error("Period not found");

    const [classesRevenue, privateLessonsRevenue, eventsRevenue] = await Promise.all([
      getClassesRevenueForPeriod(periodId),
      getPrivateLessonRevenueInRange(period.start_date, period.end_date),
      getEventRevenueInRange(period.start_date, period.end_date),
    ]);

    return {
      classesRevenue,
      privateLessonsRevenue,
      eventsRevenue,
      totalRevenue: classesRevenue + privateLessonsRevenue + eventsRevenue,
    };
  } catch (error) {
    console.error("Error retrieving period revenue summary", error);
    return {
      classesRevenue: 0,
      privateLessonsRevenue: 0,
      eventsRevenue: 0,
      totalRevenue: 0,
    };
  }
};
