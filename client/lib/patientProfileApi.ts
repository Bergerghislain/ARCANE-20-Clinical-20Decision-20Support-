import { apiFetch } from "@/lib/api";
import {
  normalizePatientReportProfile,
  PatientReportProfile,
} from "@/lib/patientReport";

interface PatientProfileApiOut {
  patient_id: number;
  source: string;
  profile: unknown | null;
  profile_version?: number | null;
  stored_schema_version?: number | null;
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
  const profileWithMeta =
    payload.profile && typeof payload.profile === "object"
      ? ({
          ...(payload.profile as Record<string, unknown>),
          profileVersion:
            typeof payload.profile_version === "number"
              ? payload.profile_version
              : undefined,
          schemaVersion:
            typeof payload.stored_schema_version === "number"
              ? payload.stored_schema_version
              : (payload.profile as Record<string, unknown>).schemaVersion,
        } as Record<string, unknown>)
      : payload.profile;
  return normalizePatientReportProfile(profileWithMeta, patientId);
}

export async function savePatientProfileToApi(
  patientId: string,
  profile: PatientReportProfile,
): Promise<PatientReportProfile | null> {
  const res = await apiFetch(`/api/patients/${patientId}/profile`, {
    method: "PUT",
    body: JSON.stringify({
      ...profile,
      schemaVersion: profile.schemaVersion || 1,
      profileVersion:
        typeof profile.profileVersion === "number"
          ? profile.profileVersion
          : undefined,
      patientId: String(patientId),
    }),
  });
  if (!res.ok) {
    throw new Error("Impossible de sauvegarder le profil patient via l'API.");
  }
  const payload = (await res.json()) as PatientProfileApiOut;
  if (!payload.profile) return null;
  const profileWithMeta =
    payload.profile && typeof payload.profile === "object"
      ? ({
          ...(payload.profile as Record<string, unknown>),
          profileVersion:
            typeof payload.profile_version === "number"
              ? payload.profile_version
              : undefined,
          schemaVersion:
            typeof payload.stored_schema_version === "number"
              ? payload.stored_schema_version
              : (payload.profile as Record<string, unknown>).schemaVersion,
        } as Record<string, unknown>)
      : payload.profile;
  return normalizePatientReportProfile(profileWithMeta, patientId);
}

