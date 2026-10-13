// PostgREST filter for `.or()`: any of `columns` contains `term`
// (case-insensitive). The term is double-quoted so commas, dots and
// parentheses typed into a search box stay part of the value instead of
// adding filters of their own.
export const ilikeAny = (columns, term) => {
  const value = `"%${String(term ?? "").replace(/[\\"]/g, "\\$&")}%"`;
  return columns.map((column) => `${column}.ilike.${value}`).join(",");
};
