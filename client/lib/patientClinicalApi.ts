import { apiFetch } from "@/lib/api";
import type { PatientClinicalData } from "@/lib/patientReport";

export type PatientClinicalBundle = PatientClinicalData;

export type ClinicalEntityRecord = Record<string, unknown> & { id: number };

async function parseClinicalResponse(response: Response): Promise<ClinicalEntityRecord> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Erreur lors de l'opération clinique.");
  }
  return (await response.json()) as ClinicalEntityRecord;
}

async function clinicalMutation(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ClinicalEntityRecord | void> {
  const response = await apiFetch(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (method === "DELETE") {
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Erreur lors de la suppression.");
    }
    return;
  }
  return parseClinicalResponse(response);
}

export async function fetchPatientClinicalBundle(
  patientId: string,
): Promise<PatientClinicalBundle> {
  const response = await apiFetch(`/api/patients/${patientId}/clinical`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Impossible de charger le dossier clinique.");
  }
  return (await response.json()) as PatientClinicalBundle;
}

const base = (patientId: string) => `/api/patients/${patientId}/clinical`;

export const createMeasure = (patientId: string, body: Record<string, unknown>) =>
  clinicalMutation(`${base(patientId)}/measures`, "POST", body) as Promise<ClinicalEntityRecord>;

export const updateMeasure = (
  patientId: string,
  measureId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(`${base(patientId)}/measures/${measureId}`, "PUT", body) as Promise<ClinicalEntityRecord>;

export const deleteMeasure = (patientId: string, measureId: number) =>
  clinicalMutation(`${base(patientId)}/measures/${measureId}`, "DELETE");

export const createMedication = (patientId: string, body: Record<string, unknown>) =>
  clinicalMutation(`${base(patientId)}/medications`, "POST", body) as Promise<ClinicalEntityRecord>;

export const updateMedication = (
  patientId: string,
  medicationId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(
    `${base(patientId)}/medications/${medicationId}`,
    "PUT",
    body,
  ) as Promise<ClinicalEntityRecord>;

export const deleteMedication = (patientId: string, medicationId: number) =>
  clinicalMutation(`${base(patientId)}/medications/${medicationId}`, "DELETE");

export const createSurgery = (patientId: string, body: Record<string, unknown>) =>
  clinicalMutation(`${base(patientId)}/surgeries`, "POST", body) as Promise<ClinicalEntityRecord>;

export const updateSurgery = (
  patientId: string,
  surgeryId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(`${base(patientId)}/surgeries/${surgeryId}`, "PUT", body) as Promise<ClinicalEntityRecord>;

export const deleteSurgery = (patientId: string, surgeryId: number) =>
  clinicalMutation(`${base(patientId)}/surgeries/${surgeryId}`, "DELETE");

export const createRadiotherapy = (patientId: string, body: Record<string, unknown>) =>
  clinicalMutation(`${base(patientId)}/radiotherapies`, "POST", body) as Promise<ClinicalEntityRecord>;

export const updateRadiotherapy = (
  patientId: string,
  radiotherapyId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(
    `${base(patientId)}/radiotherapies/${radiotherapyId}`,
    "PUT",
    body,
  ) as Promise<ClinicalEntityRecord>;

export const deleteRadiotherapy = (patientId: string, radiotherapyId: number) =>
  clinicalMutation(`${base(patientId)}/radiotherapies/${radiotherapyId}`, "DELETE");

export const createImagingStudy = (patientId: string, body: Record<string, unknown>) =>
  clinicalMutation(`${base(patientId)}/imaging-studies`, "POST", body) as Promise<ClinicalEntityRecord>;

export const updateImagingStudy = (
  patientId: string,
  imagingId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(
    `${base(patientId)}/imaging-studies/${imagingId}`,
    "PUT",
    body,
  ) as Promise<ClinicalEntityRecord>;

export const deleteImagingStudy = (patientId: string, imagingId: number) =>
  clinicalMutation(`${base(patientId)}/imaging-studies/${imagingId}`, "DELETE");

export const createTnmEvent = (
  patientId: string,
  primaryCancerId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(
    `${base(patientId)}/primary-cancers/${primaryCancerId}/tnm-events`,
    "POST",
    body,
  ) as Promise<ClinicalEntityRecord>;

export const createSpecimen = (patientId: string, body: Record<string, unknown>) =>
  clinicalMutation(`${base(patientId)}/specimens`, "POST", body) as Promise<ClinicalEntityRecord>;

export const createBiomarker = (
  patientId: string,
  specimenId: number,
  body: Record<string, unknown>,
) =>
  clinicalMutation(
    `${base(patientId)}/specimens/${specimenId}/biomarkers`,
    "POST",
    body,
  ) as Promise<ClinicalEntityRecord>;
