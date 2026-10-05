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

// MM/DD/YYYY for any timestamp or date-only string. Date-only strings
// ("2025-03-01") are read as local dates — `new Date("2025-03-01")` would
// read them as UTC midnight and show the previous day in US timezones.
export const formatDate = (date) => {
  if (!date) return "—";
  const momentFormattedDate =
    date instanceof Date
      ? moment(date)
      : moment(date, "YYYY-MM-DD'T'HH:mm:ss.SSSSSSZ");
  return momentFormattedDate.isValid()
    ? momentFormattedDate.format("MM/DD/YYYY")
    : "—";
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// "$1,234.50" for display. Missing values show an em dash rather than
// "$0.00", so "no amount" never reads as "free".
export const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  return Number.isFinite(num) ? moneyFormatter.format(num) : "—";
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

// "18:00" / "18:00:00" → "6:00 PM".
export const formatTime = (time) => {
  const [h, m] = String(time ?? "").split(":").map(Number);
  if (!Number.isFinite(h)) return "—";
  const date = new Date(2000, 0, 1, h, Number.isFinite(m) ? m : 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
