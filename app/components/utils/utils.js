import moment from "moment";
export const formatPhoneNumber = (phone) => {
  // Remove any non-digit characters
  const digits = phone?.replace(/\D/g, "");

  // Format based on the number of digits
  if (!digits) {
    return "";
  } else if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
      6,
      10
    )}`;
  }
};

export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const formatDate = (date) => {
  const momentFormattedDate = moment(date, "YYYY-MM-DD'T'HH:mm:ss.SSSSSSZ");
  return momentFormattedDate.format("MM/DD/YYYY");
};

// Returns today's date as "YYYY-MM-DD" in the given IANA timezone.
// Uses Intl so it stays correct regardless of the browser/server timezone
// (previously "today" was derived from UTC, which flipped the day near
// midnight in US timezones and picked the wrong event price).
export const getTodayInTimezone = (timeZone) => {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch (error) {
    return new Date().toISOString().split("T")[0];
  }
};

export const formatDatestamp = (date) => {
  return moment(date).format("MM-DD-YYYY HH:mm A");
};

export const groupStudentsById = (studentList) => {
  const studentMap = new Map();
  studentList.forEach((item) => {
    if (!studentMap.has(item.id)) {
      studentMap.set(item.id, { ...item, class_info: [...item.class_info] });
    } else {
      const existing = studentMap.get(item.id);
      existing.class_info = [
        ...new Set([...existing.class_info, ...item.class_info]),
      ];
    }
  });
  return Array.from(studentMap.values());
};
