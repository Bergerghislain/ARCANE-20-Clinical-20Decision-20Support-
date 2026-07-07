import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { stashPatientsListPayload } from "@/lib/dashboardPatientsCache";
import { normalizePatient } from "@/lib/patientNormalize";
import { queryKeys } from "@/lib/queryKeys";

async function fetchPatientsPage(limit: number, offset: number) {
  const res = await apiFetch(`/api/patients?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    throw new Error("Impossible de charger la liste des patients.");
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    return { patients: [], hasMore: false, raw: [] as unknown[] };
  }
  if (offset === 0) {
    stashPatientsListPayload(data);
  }
  const patients = data.map((row, index) =>
    normalizePatient(row, offset + index),
  );
  return {
    patients,
    hasMore: patients.length === limit,
    raw: data,
  };
}

export function usePatientsQuery(limit: number, offset = 0) {
  return useQuery({
    queryKey: queryKeys.patients.list(limit, offset),
    queryFn: () => fetchPatientsPage(limit, offset),
  });
}

export { fetchPatientsPage };
