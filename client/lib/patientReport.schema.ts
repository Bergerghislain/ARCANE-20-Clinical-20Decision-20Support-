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

export const patientReportProfileSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  patientId: z.string().min(1),
  diagnosis: z.string().min(1),
  pathologySummary: z.string().min(1),
  analyses: z.array(patientAnalysisEntrySchema).default([]),
  report: simulatedIaReportSchema,
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

