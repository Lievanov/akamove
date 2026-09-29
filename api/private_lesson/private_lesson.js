import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getPrivateLessons = async (startPage, endPage, searchTerm = "") => {
  try {
    let query = supabase
      .from("private_lessons_view")
      .select("*")
      .range(startPage, endPage)
      .order("is_active", { ascending: false })
      .order("date_purchased", { ascending: false });

    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,instructor_name.ilike.%${searchTerm}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving private lessons from database");
  }
};

export const getPrivateLessonCount = async (searchTerm = "") => {
  try {
    let query = supabase
      .from("private_lessons_view")
      .select("id", { count: "exact", head: true });

    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,instructor_name.ilike.%${searchTerm}%`
      );
    }

    const { count, error } = await query;
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving private lesson count from database");
  }
};

export const getPrivateLessonById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("private_lessons")
      .select(
        `*, student:student_id(first_name, last_name), instructor:instructor_id(name)`
      )
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId())
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving private lesson by id from database");
  }
};

export const createPrivateLesson = async ({
  student_id,
  instructor_id,
  lessons_purchased,
  date_purchased,
  amount,
}) => {
  try {
    const { error } = await supabase.from("private_lessons").insert({
      student_id,
      instructor_id,
      lessons_purchased,
      lessons_used: 0,
      date_purchased,
      amount,
      tenant_id: getActiveTenantId(),
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating private lesson", JSON.stringify(error));
    return false;
  }
};

export const updatePrivateLesson = async ({
  id,
  student_id,
  instructor_id,
  lessons_purchased,
  date_purchased,
  amount,
}) => {
  try {
    const { error } = await supabase
      .from("private_lessons")
      .update({ student_id, instructor_id, lessons_purchased, date_purchased, amount })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating private lesson", JSON.stringify(error));
    return false;
  }
};

export const recordPrivateLessonUsed = async (id, instructor_id, used_at = null) => {
  try {
    const { data: current, error: fetchError } = await supabase
      .from("private_lessons")
      .select("lessons_used, lessons_purchased")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId())
      .single();
    if (fetchError) throw fetchError;

    const newLessonsUsed = current.lessons_used + 1;
    // Automatically deactivate the package once all lessons are consumed.
    const stillActive = newLessonsUsed < current.lessons_purchased;

    const { error: updateError } = await supabase
      .from("private_lessons")
      .update({ lessons_used: newLessonsUsed, instructor_id, is_active: stillActive })
      .eq("id", id);
    if (updateError) throw updateError;

    const logEntry = {
      private_lesson_id: id,
      instructor_id,
      tenant_id: getActiveTenantId(),
    };
    if (used_at) logEntry.used_at = used_at;

    const { error: logError } = await supabase
      .from("private_lesson_logs")
      .insert(logEntry);
    if (logError) throw logError;

    return true;
  } catch (error) {
    console.error("Error using private lesson", JSON.stringify(error));
    return false;
  }
};

export const setPrivateLessonActive = async (id, is_active) => {
  try {
    const { error } = await supabase
      .from("private_lessons")
      .update({ is_active })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating private lesson status", JSON.stringify(error));
    return false;
  }
};

export const deletePrivateLesson = async (id) => {
  try {
    const { error } = await supabase
      .from("private_lessons")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting private lesson", JSON.stringify(error));
    return false;
  }
};

export const getPrivateLessonLogsReport = async (year, month, instructorId = null) => {
  try {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();

    let query = supabase
      .from("private_lesson_logs")
      .select(
        `id, used_at, instructor:instructor_id(id, name), private_lesson:private_lesson_id(amount, lessons_purchased, student:student_id(first_name, last_name))`
      )
      .gte("used_at", start)
      .lt("used_at", end)
      .order("used_at", { ascending: false });

    if (instructorId) {
      query = query.eq("instructor_id", instructorId);
    }

    query = query.eq("tenant_id", getActiveTenantId());

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error retrieving private lesson logs report", JSON.stringify(error));
    return [];
  }
};

export const getPrivateLessonsInRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("private_lessons_view")
      .select("*")
      .gte("date_purchased", startDate)
      .lte("date_purchased", endDate)
      .order("date_purchased", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving private lessons in range", error);
    return [];
  }
};

export const getPrivateLessonRevenueInRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("private_lessons")
      .select("amount")
      .gte("date_purchased", startDate)
      .lte("date_purchased", endDate)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data.reduce((sum, row) => sum + (row.amount || 0), 0);
  } catch (error) {
    console.error("Error retrieving private lesson revenue in range", error);
    return 0;
  }
};

export const getPrivateLessonLogs = async (privateLessonId) => {
  try {
    const { data, error } = await supabase
      .from("private_lesson_logs")
      .select(`*, instructor:instructor_id(name)`)
      .eq("private_lesson_id", privateLessonId)
      .eq("tenant_id", getActiveTenantId())
      .order("used_at", { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving private lesson logs", JSON.stringify(error));
  }
};
