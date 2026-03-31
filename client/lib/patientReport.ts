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

export interface PatientClinicalData {
  ipp: string;
  birthDateYear: number | null;
  birthDateMonth: number | null;
  sex: string;
  deathDateYear: number | null;
  deathDateMonth: number | null;
  lastVisitDateYear: number | null;
  lastVisitDateMonth: number | null;
  lastNewsDateYear: number | null;
  lastNewsDateMonth: number | null;
  medication: Record<string, unknown>[];
  surgery: Record<string, unknown>[];
  primaryCancer: Record<string, unknown>[];
  biologicalSpecimenList: Record<string, unknown>[];
  mesureList: Record<string, unknown>[];
}

export interface PatientReportProfile {
  schemaVersion: number;
  patientId: string;
  diagnosis: string;
  pathologySummary: string;
  analyses: PatientAnalysisEntry[];
  report: SimulatedIaReport;
  clinicalData?: PatientClinicalData;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean);
}

function readObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({ ...(item as Record<string, unknown>) }));
}

function toMonthYearLabel(year: number | null, month: number | null): string | undefined {
  if (!year) return undefined;
  const safeMonth = month && month > 0 && month <= 12 ? month : null;
  return safeMonth ? `${year}-${String(safeMonth).padStart(2, "0")}` : String(year);
}

function buildClinicalData(source: Record<string, unknown>): PatientClinicalData {
  const root =
    source.clinicalData && typeof source.clinicalData === "object"
      ? (source.clinicalData as Record<string, unknown>)
      : source;

  return {
    ipp: readString(root.ipp || source.ipp),
    birthDateYear: readNumber(root.birthDateYear ?? root.birth_date_year),
    birthDateMonth: readNumber(root.birthDateMonth ?? root.birth_date_month),
    sex: readString(root.sex || source.sex),
    deathDateYear: readNumber(root.deathDateYear ?? root.death_date_year),
    deathDateMonth: readNumber(root.deathDateMonth ?? root.death_date_month),
    lastVisitDateYear: readNumber(root.lastVisitDateYear ?? root.last_visit_date_year),
    lastVisitDateMonth: readNumber(root.lastVisitDateMonth ?? root.last_visit_date_month),
    lastNewsDateYear: readNumber(root.lastNewsDateYear ?? root.last_news_date_year),
    lastNewsDateMonth: readNumber(root.lastNewsDateMonth ?? root.last_news_date_month),
    medication: readObjectArray(root.medication),
    surgery: readObjectArray(root.surgery),
    primaryCancer: readObjectArray(root.primaryCancer),
    biologicalSpecimenList: readObjectArray(
      root.biologicalSpecimenList ?? root.biological_specimen_list,
    ),
    mesureList: readObjectArray(root.mesureList ?? root.measureList ?? root.measure_list),
  };
}

function analysesFromMeasureList(measures: Record<string, unknown>[]): PatientAnalysisEntry[] {
  return measures
    .map((measure) => {
      const name = readString(measure.measureType || measure.name || measure.type);
      const valueRaw = measure.measureValue ?? measure.value;
      const value =
        typeof valueRaw === "number"
          ? String(valueRaw)
          : typeof valueRaw === "string"
            ? valueRaw
            : "";
      if (!name && !value) return null;
      const year = readNumber(measure.measureDateYear ?? measure.year);
      const month = readNumber(measure.measureDateMonth ?? measure.month);
      return {
        name: name || "Mesure",
        value: value || "Non renseigne",
        unit: readString(measure.measureUnit || measure.unit) || undefined,
        date: toMonthYearLabel(year, month),
      } satisfies PatientAnalysisEntry;
    })
    .filter(Boolean) as PatientAnalysisEntry[];
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

function inferDiagnosis(clinicalData: PatientClinicalData): string {
  const firstCancer =
    clinicalData.primaryCancer.length > 0 ? clinicalData.primaryCancer[0] : null;
  if (!firstCancer) return "";
  const topography = readString(firstCancer.topographyCode);
  const morphology = readString(firstCancer.morphologyCode);
  if (!topography && !morphology) return "";
  return `Cancer primaire ${topography || "non code"}${morphology ? ` (${morphology})` : ""}`;
}

function inferPathologySummary(clinicalData: PatientClinicalData): string {
  const parts = [
    `${clinicalData.primaryCancer.length} cancer(s) primaire(s)`,
    `${clinicalData.biologicalSpecimenList.length} specimen(s) biologique(s)`,
    `${clinicalData.mesureList.length} mesure(s) clinique(s)`,
  ];
  return `Profil clinique structure: ${parts.join(", ")}.`;
}

export function normalizePatientReportProfile(
  raw: unknown,
  fallbackPatientId?: string,
): PatientReportProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const clinicalData = buildClinicalData(source);
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
    source.patientId || source.patient_id || source.id_patient || clinicalData.ipp,
    fallbackPatientId || "",
  );
  if (!patientId) return null;

  const rawDiagnosis = readString(
    source.diagnosis || pathology.diagnosis || source.condition,
  );
  const rawPathologySummary = readString(
    source.pathologySummary || pathology.summary || source.summary,
  );
  const analysesFromPayload = normalizeAnalyses(source.analyses);
  const analyses =
    analysesFromPayload.length > 0
      ? analysesFromPayload
      : analysesFromMeasureList(clinicalData.mesureList);
  const sources = readStringArray(
    reportContainer.sources ||
      reportContainer.references ||
      reportContainer.bibliography,
  );
  const diagnosis = rawDiagnosis || inferDiagnosis(clinicalData) || "Diagnostic non precise";
  const pathologySummary =
    rawPathologySummary ||
    inferPathologySummary(clinicalData) ||
    "Resume pathologique non renseigne pour ce patient.";

  const candidate: PatientReportProfile = {
    schemaVersion:
      typeof source.schemaVersion === "number" && Number.isFinite(source.schemaVersion)
        ? Number(source.schemaVersion)
        : 1,
    patientId,
    diagnosis,
    pathologySummary,
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
    clinicalData,
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
  const clinicalLines = profile.clinicalData
    ? [
        `IPP: ${profile.clinicalData.ipp || "Non renseigne"}`,
        `Sexe: ${profile.clinicalData.sex || "Non renseigne"}`,
        `Cancers primaires: ${profile.clinicalData.primaryCancer.length}`,
        `Specimens: ${profile.clinicalData.biologicalSpecimenList.length}`,
        `Mesures: ${profile.clinicalData.mesureList.length}`,
      ]
    : [];

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
    ...(clinicalLines.length > 0 ? ["Donnees structurees:", ...clinicalLines] : []),
    "Conclusion IA de reference:",
    profile.report.conclusion,
  ].join("\n");
}

