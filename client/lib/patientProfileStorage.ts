import { PatientReportProfile } from "@/lib/patientReport";
import { storedPatientProfileDraftSchema } from "@/lib/patientReport.schema";

const STORAGE_PREFIX = "arcane_patient_profile_v1";

export interface StoredPatientProfileDraft {
  schemaVersion: 1;
  savedAt: string;
  profile: PatientReportProfile;
}

function getStorageKey(patientId: string): string {
  return `${STORAGE_PREFIX}:${patientId}`;
}

export function savePatientProfileDraft(
  patientId: string,
  profile: PatientReportProfile,
): StoredPatientProfileDraft {
  const payload: StoredPatientProfileDraft = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    profile: {
      ...profile,
      schemaVersion: 1,
      patientId: String(patientId),
    },
  };
  localStorage.setItem(getStorageKey(patientId), JSON.stringify(payload));
  return payload;
}

export function loadPatientProfileDraft(
  patientId: string,
): StoredPatientProfileDraft | null {
  const raw = localStorage.getItem(getStorageKey(patientId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const validated = storedPatientProfileDraftSchema.safeParse(parsed);
    if (!validated.success) return null;
    const data = validated.data as StoredPatientProfileDraft;
    return {
      schemaVersion: 1,
      savedAt: data.savedAt,
      profile: {
        ...data.profile,
        schemaVersion: 1,
        patientId: String(data.profile.patientId || patientId),
      },
    };
  } catch {
    return null;
  }
}

export function clearPatientProfileDraft(patientId: string): void {
  localStorage.removeItem(getStorageKey(patientId));
}

