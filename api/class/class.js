import supabase from "@/lib/supabase/client";
import { getActiveTenantId } from "@/lib/tenant/activeTenant";

export const getClasses = async (startPage, endPage, searchTerm) => {
  try {
    let { data, error } = await supabase
      .from("class")
      .select("*")
      .range(startPage, endPage)
      .or(`name.ilike.%${searchTerm}%`)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving classes from database");
  }
};

export const getClassCountFiltered = async (searchTerm) => {
  try {
    let { count, error } = await supabase
      .from("class")
      .select("id", { count: "exact", head: true })
      .or(`name.ilike.%${searchTerm}%`)
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving class count from database");
  }
};

export const getAllClasses = async () => {
  try {
    let { data, error } = await supabase
      .from("class")
      .select("id, name, level, class_type, order")
      .eq("tenant_id", getActiveTenantId());
    const updatedData = data.map((item) => ({
      ...item,
      label: `${item.name} ${item.level}`,
    }));
    if (error) throw error;
    return updatedData;
  } catch (error) {
    console.error("Error retrieving classes from database");
  }
};

// Given a list of classes (with class_type + order), map each class id to the
// next class in the same class_type track (the smallest order strictly greater
// than the current one). Classes with no successor map to themselves.
export const buildNextClassMap = (classes = []) => {
  const map = {};
  for (const c of classes) {
    if (c.order == null || c.class_type == null) {
      map[c.id] = c.id;
      continue;
    }
    const next = classes
      .filter((o) => o.class_type === c.class_type && o.order > c.order)
      .sort((a, b) => a.order - b.order)[0];
    map[c.id] = next ? next.id : c.id;
  }
  return map;
};

export const getClassById = async (id) => {
  try {
    let { data, error } = await supabase
      .from("class")
      .select("id, name, level")
      .eq("id", id)
      .eq("tenant_id", getActiveTenantId());
    const updatedData = data.map((item) => ({
      ...item,
      label: `${item.name} ${item.level}`,
    }));
    if (error) throw error;
    return updatedData;
  } catch (error) {
    console.error(error);
    console.error("Error retrieving class by Id from database");
  }
};

export const formatClasses = async (classes) => {
  return await Promise.all(
    classes.map(async (c) => {
      const formattedClasses = await getClassById(c);
      return formattedClasses[0];
    })
  );
};

export const getClassesCount = async () => {
  try {
    let { count, error } = await supabase
      .from("class")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", getActiveTenantId());
    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Error retrieving class count from database");
  }
};

export const getClassesByType = async (classType) => {
  try {
    let { data, error } = await supabase
      .from("class")
      .select("*")
      .eq("class_type", classType)
      .eq("tenant_id", getActiveTenantId())
      .order("order");
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving classes from database");
  }
};

export const getClassesByStudent = async (
  startPage,
  endPage,
  searchTerm,
  period_name
) => {
  try {
    let query = supabase
      .from("classes_by_student_view")
      .select("*")
      .range(startPage, endPage)
      .order("class_info", { ascending: true })
      .order("last_name", { ascending: true });

    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,class_info.ilike.%${searchTerm}%`
      );
    }

    if (period_name) {
      query = query.ilike("period_name", `%${period_name}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error retrieving classes by student " + error);
  }
};

export const getClassesByStudentCount = async (searchTerm, period_name) => {
  try {
    let query = supabase
      .from("classes_by_student_view")
      .select("id", { count: "exact", head: true });

    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,class_info.ilike.%${searchTerm}%`
      );
    }

    if (period_name) {
      query = query.ilike("period_name", `%${period_name}%`);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count;
  } catch (error) {
    console.error(
      "Error retrieving class by student count count from database"
    );
  }
};

export const updateAllClassesByClassType = async (data) => {
  try {
    // New levels are built client-side (ClassByType) without a tenant_id;
    // stamp every row so their inserts pass the tenant RLS check.
    const tenantId = getActiveTenantId();
    let { error } = await supabase
      .from("class")
      .upsert(data.map((row) => ({ ...row, tenant_id: tenantId })));
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(
      "Error updating classes by class type " + JSON.stringify(error)
    );
    return false;
  }
};

export const updateClassById = async (id, data) => {
  try {
    let { error } = await supabase
      .from("class")
      .update(data)
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(
      "Error updating class by id in database",
      JSON.stringify(error)
    );
    return false;
  }
};

export const deleteClassById = async (id) => {
  try {
    let { error } = await supabase.from("class").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(
      "Error deleting class by id from database",
      JSON.stringify(error)
    );
    return false;
  }
};
