import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

export function invalidatePatientsList() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
}

export function invalidatePatient(patientId: string) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.patients.detail(patientId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.patients.profile(patientId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.patients.clinical(patientId),
    }),
  ]);
}

export function invalidateArgosDiscussions(patientId?: number) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.argos.discussions(patientId),
  });
}
