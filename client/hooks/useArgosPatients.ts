import { useMemo } from "react";
import { usePatientsQuery } from "@/hooks/queries/usePatientsQuery";
import {
  normalizePatient,
  type Patient as ApiPatient,
} from "@/lib/patientNormalize";

const ARGOS_PATIENTS_PAGE_SIZE = 200;

export interface ArgosPatientOption {
  id: string;
  name: string;
  age: number;
  condition: string;
  mrn?: string;
  status?: "active" | "pending" | "completed" | "unknown";
}

export function mapApiPatientToArgos(row: ApiPatient): ArgosPatientOption {
  return {
    id: row.id,
    name: row.name?.trim() || `Patient ${row.id}`,
    age: typeof row.age === "number" ? row.age : 0,
    condition: row.condition?.trim() || "Diagnostic non renseigné",
    mrn: row.mrn ?? undefined,
    status: row.status ?? "unknown",
  };
}

/** Liste patients ARGOS — cache partagé via React Query (`usePatientsQuery`). */
export function useArgosPatients() {
  const { data, isLoading, error, refetch, isFetching } = usePatientsQuery(
    ARGOS_PATIENTS_PAGE_SIZE,
    0,
  );

  const patients = useMemo(
    () => data?.patients.map(mapApiPatientToArgos) ?? [],
    [data],
  );

  return {
    patients,
    isLoading: isLoading || isFetching,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
