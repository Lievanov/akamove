import supabase from "@/lib/supabase/client";

export const getActiveVsNonActiveStudents = async () => {
  try {
    let { data, error } = await supabase
      .from("active_vs_nonactive_students_view")
      .select("*");
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving student count from database ", error);
  }
};
