export function formatMonthYear(
  year: number | null | undefined,
  month: number | null | undefined,
): string {
  if (year == null) return "—";
  if (month == null) return String(year);
  return `${String(month).padStart(2, "0")}/${year}`;
}

export function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}
