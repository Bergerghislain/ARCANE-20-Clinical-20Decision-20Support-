import { useCallback, useEffect, useState } from "react";
import {
  fetchPatientClinicalBundle,
  type PatientClinicalBundle,
} from "@/lib/patientClinicalApi";

export function usePatientClinicalBundle(patientId: string | undefined) {
  const [data, setData] = useState<PatientClinicalBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientId) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const bundle = await fetchPatientClinicalBundle(patientId);
      setData(bundle);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Erreur de chargement clinique.");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
