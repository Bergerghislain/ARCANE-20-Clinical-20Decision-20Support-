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
  // IMPORTANT: les endpoints backend utilisent `id_patient` (int) dans l'URL `/api/patients/{id}`.
  // Donc pour le routing côté frontend, on privilégie TOUJOURS l'identifiant numérique.
  const idCandidate =
    row?.id_patient ?? row?.id ?? row?.patient_id ?? row?.ipp ?? `row_${index}`;
  // #region agent log
  try {
    const keys = row && typeof row === "object" ? Object.keys(row).slice(0, 20) : [];
    fetch('http://127.0.0.1:7401/ingest/84886cf9-a143-47ed-b36f-9883ce1f0e4b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e0cb1b'},body:JSON.stringify({sessionId:'e0cb1b',runId:'patient-not-found',hypothesisId:'H1',location:'client/lib/patientNormalize.ts:~15',message:'normalizePatient idCandidate',data:{index,idCandidateType:typeof idCandidate,has_id_patient:row?.id_patient!=null,has_id:row?.id!=null,has_patient_id:row?.patient_id!=null,has_ipp:row?.ipp!=null,keys},timestamp:Date.now()})}).catch(()=>{});
  } catch {}
  // #endregion agent log
  const id = idCandidate;
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
