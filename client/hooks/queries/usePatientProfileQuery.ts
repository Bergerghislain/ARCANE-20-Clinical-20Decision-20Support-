import { useQuery } from "@tanstack/react-query";
import { fetchPatientProfileFromApi } from "@/lib/patientProfileApi";
import { queryKeys } from "@/lib/queryKeys";

export function usePatientProfileQuery(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patients.profile(patientId ?? ""),
    queryFn: () => fetchPatientProfileFromApi(patientId!),
    enabled: Boolean(patientId),
  });
}
