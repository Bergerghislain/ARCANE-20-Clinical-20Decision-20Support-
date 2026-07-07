import { usePatientClinicalBundleQuery } from "@/hooks/queries/usePatientClinicalBundleQuery";

/** Bundle clinique — cache React Query + invalidation via `invalidatePatient`. */
export function usePatientClinicalBundle(patientId: string | undefined) {
  const { data, isLoading, error, refetch } =
    usePatientClinicalBundleQuery(patientId);

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    reload: async () => {
      await refetch();
    },
  };
}
