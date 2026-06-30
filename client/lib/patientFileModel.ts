import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import {
  parseAnalysesFromEditorText,
  type PatientClinicalData,
} from "@/lib/patientReport";

export interface PatientApiRow {
  id_patient?: number | string;
  id?: number | string;
  name?: string | null;
  ipp?: string | null;
  status?: string | null;
  condition?: string | null;
  sex?: string | null;
  birth_date_year?: number | null;
  birth_date_month?: number | null;
  birth_date_day?: number | null;
  last_visit_date_year?: number | null;
  last_visit_date_month?: number | null;
}

export interface PatientViewModel {
  id: string;
  name: string;
  age: number | null;
  mrn: string;
  status: "active" | "pending" | "completed" | "unknown";
  condition: string;
  sex: string;
  birthDate: string | null;
  lastVisit: string | null;
}

export function toIsoDate(
  year?: number | null,
  month?: number | null,
  day?: number | null,
): string | null {
  if (!year) return null;
  const safeMonth = Math.max(1, Number(month || 1));
  const safeDay = Math.max(1, Number(day || 1));
  const date = new Date(Number(year), safeMonth - 1, safeDay);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toAgeFromBirthYear(year?: number | null): number | null {
  if (!year) return null;
  const nowYear = new Date().getFullYear();
  return nowYear - Number(year);
}

export function normalizePatientDetail(row: PatientApiRow | null): PatientViewModel {
  const idRaw = row?.id_patient ?? row?.id ?? "unknown";
  const statusRaw = String(row?.status || "unknown").toLowerCase();
  const status =
    statusRaw === "active" || statusRaw === "pending" || statusRaw === "completed"
      ? statusRaw
      : "unknown";

  const birthDate = toIsoDate(
    row?.birth_date_year,
    row?.birth_date_month,
    row?.birth_date_day,
  );
  const lastVisit = toIsoDate(row?.last_visit_date_year, row?.last_visit_date_month, 1);

  return {
    id: String(idRaw),
    name: String(row?.name || `Patient ${idRaw}`),
    age: toAgeFromBirthYear(row?.birth_date_year),
    mrn: String(row?.ipp || `IPP-${idRaw}`),
    status,
    condition: String(row?.condition || "Pathologie non renseignee"),
    sex: String(row?.sex || "Non renseigne"),
    birthDate,
    lastVisit,
  };
}

export function getStatusStyle(status: PatientViewModel["status"]): string {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "pending":
      return "bg-warning/10 text-warning";
    case "completed":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function toInputValue(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function parseNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

export function formatJsonArray(value: Record<string, unknown>[]): string {
  return JSON.stringify(value, null, 2);
}

export function parseJsonArraySection(
  raw: string,
  sectionLabel: string,
): { ok: true; data: Record<string, unknown>[] } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, data: [] };
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        error: `La section ${sectionLabel} doit etre un tableau JSON (ex: []).`,
      };
    }
    const rows = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({ ...(item as Record<string, unknown>) }));
    return { ok: true, data: rows };
  } catch {
    return {
      ok: false,
      error: `Le JSON de la section ${sectionLabel} est invalide.`,
    };
  }
}

export function toClinicalDataFromPatient(patient: PatientViewModel): PatientClinicalData {
  const birthDate = patient.birthDate ? new Date(patient.birthDate) : null;
  const lastVisit = patient.lastVisit ? new Date(patient.lastVisit) : null;
  return {
    ipp: patient.mrn,
    birthDateYear: birthDate ? birthDate.getFullYear() : null,
    birthDateMonth: birthDate ? birthDate.getMonth() + 1 : null,
    sex: patient.sex || "",
    deathDateYear: null,
    deathDateMonth: null,
    lastVisitDateYear: lastVisit ? lastVisit.getFullYear() : null,
    lastVisitDateMonth: lastVisit ? lastVisit.getMonth() + 1 : null,
    lastNewsDateYear: lastVisit ? lastVisit.getFullYear() : null,
    lastNewsDateMonth: lastVisit ? lastVisit.getMonth() + 1 : null,
    medication: [],
    surgery: [],
    primaryCancer: [],
    biologicalSpecimenList: [],
    mesureList: [],
  };
}

export function analysesFromMeasureSection(
  measures: Record<string, unknown>[],
): ReturnType<typeof parseAnalysesFromEditorText> {
  return measures
    .map((item) => {
      const nameValue = item.measureType || item.name;
      const valueValue = item.measureValue || item.value;
      const name = typeof nameValue === "string" ? nameValue : "";
      const value =
        typeof valueValue === "number"
          ? String(valueValue)
          : typeof valueValue === "string"
            ? valueValue
            : "";
      if (!name && !value) return null;
      return {
        name: name || "Mesure",
        value: value || "Non renseigne",
        unit: typeof item.measureUnit === "string" ? item.measureUnit : undefined,
        referenceRange: undefined,
        date:
          typeof item.measureDateYear === "number"
            ? `${item.measureDateYear}${typeof item.measureDateMonth === "number" ? `-${String(item.measureDateMonth).padStart(2, "0")}` : ""}`
            : undefined,
      };
    })
    .filter(Boolean) as ReturnType<typeof parseAnalysesFromEditorText>;
}

export type ClinicalFormSetters = {
  setIpp: (value: string) => void;
  setClinicalSex: (value: string) => void;
  setBirthDateYear: (value: string) => void;
  setBirthDateMonth: (value: string) => void;
  setDeathDateYear: (value: string) => void;
  setDeathDateMonth: (value: string) => void;
  setLastVisitDateYear: (value: string) => void;
  setLastVisitDateMonth: (value: string) => void;
  setLastNewsDateYear: (value: string) => void;
  setLastNewsDateMonth: (value: string) => void;
  setPrimaryCancerJson: (value: string) => void;
  setSpecimenJson: (value: string) => void;
  setMeasureJson: (value: string) => void;
  setMedicationJson: (value: string) => void;
  setSurgeryJson: (value: string) => void;
};

export function applyClinicalBundleToForm(
  bundle: PatientClinicalBundle,
  setters: ClinicalFormSetters,
) {
  setters.setIpp(bundle.ipp || "");
  setters.setClinicalSex(bundle.sex || "");
  setters.setBirthDateYear(toInputValue(bundle.birthDateYear));
  setters.setBirthDateMonth(toInputValue(bundle.birthDateMonth));
  setters.setDeathDateYear(toInputValue(bundle.deathDateYear));
  setters.setDeathDateMonth(toInputValue(bundle.deathDateMonth));
  setters.setLastVisitDateYear(toInputValue(bundle.lastVisitDateYear));
  setters.setLastVisitDateMonth(toInputValue(bundle.lastVisitDateMonth));
  setters.setLastNewsDateYear(toInputValue(bundle.lastNewsDateYear));
  setters.setLastNewsDateMonth(toInputValue(bundle.lastNewsDateMonth));
  setters.setPrimaryCancerJson(
    formatJsonArray(bundle.primaryCancer as Record<string, unknown>[]),
  );
  setters.setSpecimenJson(
    formatJsonArray(bundle.biologicalSpecimenList as Record<string, unknown>[]),
  );
  setters.setMeasureJson(formatJsonArray(bundle.mesureList as Record<string, unknown>[]));
  setters.setMedicationJson(formatJsonArray(bundle.medication as Record<string, unknown>[]));
  setters.setSurgeryJson(formatJsonArray(bundle.surgery as Record<string, unknown>[]));
}
