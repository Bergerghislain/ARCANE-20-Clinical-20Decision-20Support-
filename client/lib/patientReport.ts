import { patientReportProfileSchema } from "@/lib/patientReport.schema";

export interface PatientAnalysisEntry {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  date?: string;
}

export interface SimulatedIaReport {
  conclusion: string;
  reasoning: string;
  sources: string[];
}

export interface PatientReportProfile {
  schemaVersion: number;
  patientId: string;
  diagnosis: string;
  pathologySummary: string;
  analyses: PatientAnalysisEntry[];
  report: SimulatedIaReport;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean);
}

function normalizeAnalyses(raw: unknown): PatientAnalysisEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const name = readString(entry.name || entry.test || entry.label);
      const value = readString(
        entry.value ||
          entry.result ||
          (entry.value_numeric != null ? String(entry.value_numeric) : ""),
      );
      if (!name && !value) return null;
      return {
        name: name || "Analyse",
        value: value || "Non renseigne",
        unit: readString(entry.unit),
        referenceRange: readString(entry.referenceRange || entry.reference),
        date: readString(entry.date || entry.collectedAt || entry.measuredAt),
      } satisfies PatientAnalysisEntry;
    })
    .filter(Boolean) as PatientAnalysisEntry[];
}

export function normalizePatientReportProfile(
  raw: unknown,
  fallbackPatientId?: string,
): PatientReportProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const pathology =
    source.pathology && typeof source.pathology === "object"
      ? (source.pathology as Record<string, unknown>)
      : {};
  const reportContainer =
    (source.report && typeof source.report === "object"
      ? (source.report as Record<string, unknown>)
      : source.ia_report && typeof source.ia_report === "object"
        ? (source.ia_report as Record<string, unknown>)
        : source.ai_report && typeof source.ai_report === "object"
          ? (source.ai_report as Record<string, unknown>)
          : {}) || {};

  const patientId = readString(
    source.patientId || source.patient_id || source.id_patient,
    fallbackPatientId || "",
  );
  if (!patientId) return null;

  const diagnosis = readString(
    source.diagnosis || pathology.diagnosis || source.condition,
  );
  const pathologySummary = readString(
    source.pathologySummary || pathology.summary || source.summary,
  );
  const analyses = normalizeAnalyses(source.analyses);
  const sources = readStringArray(
    reportContainer.sources ||
      reportContainer.references ||
      reportContainer.bibliography,
  );

  const candidate: PatientReportProfile = {
    schemaVersion:
      typeof source.schemaVersion === "number" && Number.isFinite(source.schemaVersion)
        ? Number(source.schemaVersion)
        : 1,
    patientId,
    diagnosis: diagnosis || "Diagnostic non precise",
    pathologySummary:
      pathologySummary || "Resume pathologique non renseigne pour ce patient.",
    analyses,
    report: {
      conclusion:
        readString(reportContainer.conclusion) ||
        "Aucune conclusion IA pre-calculee dans le JSON.",
      reasoning:
        readString(reportContainer.reasoning) ||
        "Aucun raisonnement IA pre-calcule dans le JSON.",
      sources:
        sources.length > 0
          ? sources
          : ["Sources non renseignees dans le JSON de simulation."],
    },
  };

  const parsed = patientReportProfileSchema.safeParse(candidate);
  if (!parsed.success) return null;
  return candidate;
}

export async function loadPatientReportProfile(
  patientId: string,
): Promise<PatientReportProfile | null> {
  const res = await fetch(`/patient-reports/${patientId}.json`);
  if (!res.ok) return null;
  const data = await res.json();
  return normalizePatientReportProfile(data, patientId);
}

export function analysesToEditorText(analyses: PatientAnalysisEntry[]): string {
  return analyses
    .map((entry) =>
      [
        entry.name,
        entry.value,
        entry.unit || "",
        entry.referenceRange || "",
        entry.date || "",
      ]
        .map((part) => part.trim())
        .join(" | "),
    )
    .join("\n");
}

export function parseAnalysesFromEditorText(
  value: string,
): PatientAnalysisEntry[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, result, unit, referenceRange, date] = line
        .split("|")
        .map((part) => part.trim());
      return {
        name: name || "Analyse",
        value: result || "Non renseigne",
        unit: unit || undefined,
        referenceRange: referenceRange || undefined,
        date: date || undefined,
      } satisfies PatientAnalysisEntry;
    });
}

export function buildSimulatedAiReport(input: {
  patientName: string;
  diagnosis: string;
  pathologySummary: string;
  analyses: PatientAnalysisEntry[];
}): SimulatedIaReport {
  const keyAnalyses = input.analyses.slice(0, 3);
  const analysesSentence =
    keyAnalyses.length > 0
      ? keyAnalyses
          .map((item) => `${item.name}: ${item.value}${item.unit ? ` ${item.unit}` : ""}`)
          .join(", ")
      : "Aucune analyse biologique detaillee";

  return {
    conclusion:
      `Pour ${input.patientName}, les donnees disponibles sont compatibles avec un suivi ` +
      `oriente sur "${input.diagnosis}". La priorite clinique est de consolider le bilan ` +
      `et de poursuivre une strategie therapeutique personnalisee.`,
    reasoning:
      `1) Le contexte pathologique retient: ${input.pathologySummary}. ` +
      `2) Les analyses structurantes observees sont: ${analysesSentence}. ` +
      `3) Sur cette base, l'IA privilegie une approche prudente, reevaluable a chaque nouveau resultat.`,
    sources: [
      "Recommandations institutionnelles internes ARCANE (simulation)",
      "Synthese de guidelines oncologie (simulation JSON locale)",
      "Historique patient et analyses biologiques structurees",
    ],
  };
}

export function buildArgosContextFromProfile(
  profile: PatientReportProfile,
  patientName: string,
  mrn?: string,
): string {
  const analysesBlock =
    profile.analyses.length > 0
      ? profile.analyses
          .map(
            (entry) =>
              `- ${entry.name}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ""}${entry.referenceRange ? ` (Ref: ${entry.referenceRange})` : ""}`,
          )
          .join("\n")
      : "- Aucune analyse detaillee fournie";

  return [
    `Contexte patient auto-charge: ${patientName}${mrn ? ` (${mrn})` : ""}`,
    `Diagnostic: ${profile.diagnosis}`,
    `Resume pathologique: ${profile.pathologySummary}`,
    "Resultats d'analyses:",
    analysesBlock,
    "Conclusion IA de reference:",
    profile.report.conclusion,
  ].join("\n");
}

