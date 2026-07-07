import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  normalizePatientDetail,
  type PatientApiRow,
} from "@/lib/patientFileModel";
import { queryKeys } from "@/lib/queryKeys";

async function fetchPatientDetail(patientId: string) {
  const res = await apiFetch(`/api/patients/${patientId}`);
  if (!res.ok) {
    throw new Error("Patient introuvable.");
  }
  const data = (await res.json()) as PatientApiRow;
  return normalizePatientDetail(data);
}

export function usePatientDetailQuery(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patients.detail(patientId ?? ""),
    queryFn: () => fetchPatientDetail(patientId!),
    enabled: Boolean(patientId),
  });
}
