import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getStudents = async (startPage, endPage, searchTerm) => {
  try {
    let { data, error } = await supabase
      .from("all_students_by_last_payments_view")
      .select("*")
      .range(startPage, endPage)
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving classes from database");
  }
};

export const getStudentCount = async () => {
  try {
    let { count, error } = await supabase
      .from("student")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving student count from database");
  }
};

export const getStudentCountFiltered = async (searchTerm) => {
  try {
    let { count, error } = await supabase
      .from("all_students_by_last_payments_view")
      .select("id", { count: "exact", head: true })
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving student count from database");
  }
};

export const getStudentByStatusCount = async (is_active) => {
  try {
    let { count, error } = await supabase
      .from("student")
      .select("id", { count: "exact", head: true })
      .eq("is_active", is_active)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving student count from database");
  }
};

export const getStudentById = async (id) => {
  try {
    let { data, error } = await supabase
      .from("student")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error retrieving student" + JSON.stringify(error));
  }
};

export const createStudent = async ({
  first_name,
  last_name,
  date_of_birth,
  email,
  phone,
  notes,
  is_active,
  classes,
  credit,
}) => {
  try {
    const { data, error } = await supabase
      .from("student")
      .insert([
        {
          first_name,
          last_name,
          date_of_birth,
          email,
          phone,
          notes,
          is_active,
          classes,
          credit,
          tenant_id: getActiveTenantId(),
        },
      ])
      .select();
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const updateStudent = async ({
  id,
  first_name,
  last_name,
  date_of_birth,
  email,
  phone,
  notes,
  is_active,
  classes,
  credit,
}) => {
  try {
    const { data, error } = await supabase
      .from("student")
      .update({
        first_name,
        last_name,
        date_of_birth,
        email,
        phone,
        notes,
        is_active,
        classes,
        credit,
      })
      .eq("id", id)
      .select();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error while updating Student");
    console.error(error);
    return false;
  }
};

export const updateStudentCredit = async (studentId, credit) => {
  try {
    const { data, error } = await supabase
      .from("student")
      .update({ credit })
      .eq("id", studentId)
      .select();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating student credit", error);
    return false;
  }
};

export const updateStudentNotes = async (studentId, notes) => {
  try {
    const { data, error } = await supabase
      .from("student")
      .update({ notes })
      .eq("id", studentId)
      .select();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating student notes", error);
    return false;
  }
};

export const getStudentsBylastPayment = async (
  startPage,
  endPage,
  searchTerm
) => {
  try {
    const { data, error } = await supabase
      .from("all_students_by_last_payments_view")
      .select("*")
      .range(startPage, endPage)
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error while retreiving students by last payment", error);
  }
};
