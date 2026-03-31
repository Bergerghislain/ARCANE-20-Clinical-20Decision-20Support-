import { z } from "zod";

export const patientAnalysisEntrySchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  date: z.string().optional(),
});

export const simulatedIaReportSchema = z.object({
  conclusion: z.string().min(1),
  reasoning: z.string().min(1),
  sources: z.array(z.string().min(1)).min(1),
});

export const patientReportMetaSchema = z.object({
  generator: z.string().min(1),
  generatedAt: z.string().nullable().optional(),
});

export const patientClinicalDataSchema = z.object({
  ipp: z.string(),
  birthDateYear: z.number().int().nullable(),
  birthDateMonth: z.number().int().nullable(),
  sex: z.string(),
  deathDateYear: z.number().int().nullable(),
  deathDateMonth: z.number().int().nullable(),
  lastVisitDateYear: z.number().int().nullable(),
  lastVisitDateMonth: z.number().int().nullable(),
  lastNewsDateYear: z.number().int().nullable(),
  lastNewsDateMonth: z.number().int().nullable(),
  medication: z.array(z.record(z.unknown())),
  surgery: z.array(z.record(z.unknown())),
  primaryCancer: z.array(z.record(z.unknown())),
  biologicalSpecimenList: z.array(z.record(z.unknown())),
  mesureList: z.array(z.record(z.unknown())),
});

export const patientReportProfileSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  profileVersion: z.number().int().nonnegative().optional(),
  patientId: z.string().min(1),
  diagnosis: z.string().min(1),
  pathologySummary: z.string().min(1),
  analyses: z.array(patientAnalysisEntrySchema).default([]),
  report: simulatedIaReportSchema,
  reportMeta: patientReportMetaSchema.optional(),
  clinicalData: patientClinicalDataSchema.optional(),
});

export const storedPatientProfileDraftSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string().min(1),
  profile: patientReportProfileSchema,
});

export type PatientReportProfileSchemaType = z.infer<
  typeof patientReportProfileSchema
>;
export type StoredPatientProfileDraftType = z.infer<
  typeof storedPatientProfileDraftSchema
>;

