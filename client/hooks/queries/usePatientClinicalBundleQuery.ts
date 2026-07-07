import { useQuery } from "@tanstack/react-query";
import {
  fetchPatientClinicalBundle,
  type PatientClinicalBundle,
} from "@/lib/patientClinicalApi";
import { queryKeys } from "@/lib/queryKeys";

export function usePatientClinicalBundleQuery(patientId: string | undefined) {
  return useQuery<PatientClinicalBundle>({
    queryKey: queryKeys.patients.clinical(patientId ?? ""),
    queryFn: () => fetchPatientClinicalBundle(patientId!),
    enabled: Boolean(patientId),
  });
}
