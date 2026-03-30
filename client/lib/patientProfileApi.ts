import { apiFetch } from "@/lib/api";
import {
  normalizePatientReportProfile,
  PatientReportProfile,
} from "@/lib/patientReport";

interface PatientProfileApiOut {
  patient_id: number;
  source: string;
  profile: unknown | null;
}

export async function fetchPatientProfileFromApi(
  patientId: string,
): Promise<PatientReportProfile | null> {
  const res = await apiFetch(`/api/patients/${patientId}/profile`);
  if (!res.ok) {
    throw new Error("Impossible de charger le profil patient via l'API.");
  }
  const payload = (await res.json()) as PatientProfileApiOut;
  if (!payload.profile) return null;
  return normalizePatientReportProfile(payload.profile, patientId);
}

export async function savePatientProfileToApi(
  patientId: string,
  profile: PatientReportProfile,
): Promise<PatientReportProfile | null> {
  const res = await apiFetch(`/api/patients/${patientId}/profile`, {
    method: "PUT",
    body: JSON.stringify({
      ...profile,
      schemaVersion: 1,
      patientId: String(patientId),
    }),
  });
  if (!res.ok) {
    throw new Error("Impossible de sauvegarder le profil patient via l'API.");
  }
  const payload = (await res.json()) as PatientProfileApiOut;
  if (!payload.profile) return null;
  return normalizePatientReportProfile(payload.profile, patientId);
}

