export interface Patient {
  id: string;
  name?: string | null;
  age?: number | null;
  condition?: string | null;
  mrn?: string | null;
  birthDate?: string | null;
  lastVisit?: string | null;
  status?: "active" | "completed" | "pending" | null;
}

export const PATIENTS_PAGE_SIZE = 24;

export function normalizePatient(row: any, index: number): Patient {
  const id =
    row?.id ??
    row?.id_patient ??
    row?.patient_id ??
    row?.ipp ??
    `row_${index}`;
  const lastVisit = row?.lastVisit ?? row?.last_visit_date;
  const lastVisitIso =
    typeof lastVisit === "string" && lastVisit
      ? lastVisit
      : row?.last_visit_date_year
        ? new Date(
            Number(row.last_visit_date_year),
            Math.max(0, Number(row.last_visit_date_month || 1) - 1),
            1,
          ).toISOString()
        : null;
  const birthDateIso =
    row?.birth_date_year
      ? new Date(
          Number(row.birth_date_year),
          Math.max(0, Number(row.birth_date_month || 1) - 1),
          Math.max(1, Number(row.birth_date_day || 1)),
        ).toISOString()
      : null;

  const fallbackName = row?.ipp ? `IPP ${row.ipp}` : null;

  return {
    id: String(id),
    name: row?.name ?? row?.full_name ?? fallbackName,
    age:
      typeof row?.age === "number"
        ? row.age
        : row?.birth_date_year
          ? new Date().getFullYear() - Number(row.birth_date_year)
          : null,
    condition: row?.condition ?? row?.diagnosis ?? null,
    mrn: row?.ipp ?? String(id),
    birthDate: birthDateIso,
    lastVisit: lastVisitIso,
    status: row?.status ?? "active",
  };
}
