import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { findPatientRowInListCache } from "@/lib/dashboardPatientsCache";
import {
  analysesToEditorText,
  buildArgosContextFromProfile,
  buildSimulatedAiReport,
  loadPatientReportProfile,
  normalizePatientReportProfile,
  parseAnalysesFromEditorText,
  PatientClinicalData,
  PatientReportProfile,
  SimulatedIaReport,
} from "@/lib/patientReport";
import {
  fetchPatientProfileFromApi,
  savePatientProfileToApi,
} from "@/lib/patientProfileApi";
import {
  clearPatientProfileDraft,
  loadPatientProfileDraft,
  savePatientProfileDraft,
} from "@/lib/patientProfileStorage";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  FileJson,
  FileText,
  MessageSquare,
  Sparkles,
  Upload,
  User,
} from "lucide-react";

interface PatientApiRow {
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

interface PatientViewModel {
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

function toIsoDate(
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

function toAgeFromBirthYear(year?: number | null): number | null {
  if (!year) return null;
  const nowYear = new Date().getFullYear();
  return nowYear - Number(year);
}

function normalizePatientDetail(row: PatientApiRow): PatientViewModel {
  const idRaw = row.id_patient ?? row.id ?? "unknown";
  const statusRaw = String(row.status || "unknown").toLowerCase();
  const status =
    statusRaw === "active" || statusRaw === "pending" || statusRaw === "completed"
      ? statusRaw
      : "unknown";

  const birthDate = toIsoDate(
    row.birth_date_year,
    row.birth_date_month,
    row.birth_date_day,
  );
  const lastVisit = toIsoDate(
    row.last_visit_date_year,
    row.last_visit_date_month,
    1,
  );

  return {
    id: String(idRaw),
    name: String(row.name || `Patient ${idRaw}`),
    age: toAgeFromBirthYear(row.birth_date_year),
    mrn: String(row.ipp || `IPP-${idRaw}`),
    status,
    condition: String(row.condition || "Pathologie non renseignee"),
    sex: String(row.sex || "Non renseigne"),
    birthDate,
    lastVisit,
  };
}

function getStatusStyle(status: PatientViewModel["status"]): string {
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

function toInputValue(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function parseNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function formatJsonArray(value: Record<string, unknown>[]): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonArraySection(
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

function toClinicalDataFromPatient(patient: PatientViewModel): PatientClinicalData {
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

function analysesFromMeasureSection(
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

export default function PatientFile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFormHydratingRef = useRef(false);
  const isAutosaveReadyRef = useRef(false);
  const lastSyncedFingerprintRef = useRef<string | null>(null);

  const [patient, setPatient] = useState<PatientViewModel | null>(null);
  /** Apercu depuis le cache liste (dashboard) pendant GET /api/patients/:id (BD). */
  const [listCachePreview, setListCachePreview] = useState<PatientViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJsonLoading, setIsJsonLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("patient-info");

  const [diagnosis, setDiagnosis] = useState("");
  const [pathologySummary, setPathologySummary] = useState("");
  const [analysesEditor, setAnalysesEditor] = useState("");
  const [reportOutput, setReportOutput] = useState<SimulatedIaReport | null>(null);
  const [ipp, setIpp] = useState("");
  const [clinicalSex, setClinicalSex] = useState("");
  const [birthDateYear, setBirthDateYear] = useState("");
  const [birthDateMonth, setBirthDateMonth] = useState("");
  const [deathDateYear, setDeathDateYear] = useState("");
  const [deathDateMonth, setDeathDateMonth] = useState("");
  const [lastVisitDateYear, setLastVisitDateYear] = useState("");
  const [lastVisitDateMonth, setLastVisitDateMonth] = useState("");
  const [lastNewsDateYear, setLastNewsDateYear] = useState("");
  const [lastNewsDateMonth, setLastNewsDateMonth] = useState("");
  const [primaryCancerJson, setPrimaryCancerJson] = useState("[]");
  const [specimenJson, setSpecimenJson] = useState("[]");
  const [measureJson, setMeasureJson] = useState("[]");
  const [medicationJson, setMedicationJson] = useState("[]");
  const [surgeryJson, setSurgeryJson] = useState("[]");
  const [profileVersion, setProfileVersion] = useState<number | null>(null);

  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const hydrateFormFromProfile = (
    profile: PatientReportProfile,
    sourceLabel: string,
    options?: { markAsPersisted?: boolean },
  ) => {
    isFormHydratingRef.current = true;
    setDiagnosis(profile.diagnosis);
    setPathologySummary(profile.pathologySummary);
    setAnalysesEditor(analysesToEditorText(profile.analyses));
    setReportOutput(profile.report);
    const fallbackClinical = patient
      ? toClinicalDataFromPatient(patient)
      : {
          ipp: "",
          birthDateYear: null,
          birthDateMonth: null,
          sex: "",
          deathDateYear: null,
          deathDateMonth: null,
          lastVisitDateYear: null,
          lastVisitDateMonth: null,
          lastNewsDateYear: null,
          lastNewsDateMonth: null,
          medication: [],
          surgery: [],
          primaryCancer: [],
          biologicalSpecimenList: [],
          mesureList: [],
        };
    const clinicalData = profile.clinicalData || fallbackClinical;
    setIpp(clinicalData.ipp || patient?.mrn || "");
    setClinicalSex(clinicalData.sex || patient?.sex || "");
    setBirthDateYear(toInputValue(clinicalData.birthDateYear));
    setBirthDateMonth(toInputValue(clinicalData.birthDateMonth));
    setDeathDateYear(toInputValue(clinicalData.deathDateYear));
    setDeathDateMonth(toInputValue(clinicalData.deathDateMonth));
    setLastVisitDateYear(toInputValue(clinicalData.lastVisitDateYear));
    setLastVisitDateMonth(toInputValue(clinicalData.lastVisitDateMonth));
    setLastNewsDateYear(toInputValue(clinicalData.lastNewsDateYear));
    setLastNewsDateMonth(toInputValue(clinicalData.lastNewsDateMonth));
    setPrimaryCancerJson(formatJsonArray(clinicalData.primaryCancer));
    setSpecimenJson(formatJsonArray(clinicalData.biologicalSpecimenList));
    setMeasureJson(formatJsonArray(clinicalData.mesureList));
    setMedicationJson(formatJsonArray(clinicalData.medication));
    setSurgeryJson(formatJsonArray(clinicalData.surgery));
    setProfileVersion(
      typeof profile.profileVersion === "number" ? profile.profileVersion : null,
    );
    setInfoMessage(`Profil patient charge depuis ${sourceLabel}.`);
    setErrorMessage(null);
    if (options?.markAsPersisted) {
      lastSyncedFingerprintRef.current = JSON.stringify(profile);
      setSyncState("saved");
      setLastSavedAt(new Date().toISOString());
    }
    // Le timeout remet le flag apres la propagation des setState React.
    window.setTimeout(() => {
      isFormHydratingRef.current = false;
    }, 0);
  };

  const loadProfileFromJsonFile = async (
    id: string,
    options?: { silent?: boolean },
  ) => {
    setIsJsonLoading(true);
    try {
      const profile = await loadPatientReportProfile(id);
      if (!profile) {
        if (!options?.silent) {
          setInfoMessage(null);
          setErrorMessage(
            `Aucun fichier JSON trouve pour le patient ${id} (public/patient-reports/${id}.json).`,
          );
        }
        return;
      }
      hydrateFormFromProfile(
        profile,
        `patient-reports/${id}.json`,
        { markAsPersisted: Boolean(options?.silent) },
      );
    } catch (error) {
      if (!options?.silent) {
        setInfoMessage(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Echec du chargement JSON patient.",
        );
      }
    } finally {
      setIsJsonLoading(false);
    }
  };

  useEffect(() => {
    const fetchPatient = async () => {
      setListCachePreview(null);
      if (patientId) {
        const fromList = findPatientRowInListCache(patientId);
        if (fromList) {
          try {
            setListCachePreview(normalizePatientDetail(fromList as PatientApiRow));
          } catch {
            setListCachePreview(null);
          }
        }
      }
      setIsLoading(true);
      setInfoMessage(null);
      setErrorMessage(null);
      setSyncState("idle");
      setLastSavedAt(null);
      isAutosaveReadyRef.current = false;
      lastSyncedFingerprintRef.current = null;
      setProfileVersion(null);
      try {
        const res = await apiFetch(`/api/patients/${patientId}`);
        if (!res.ok) {
          setPatient(null);
          return;
        }
        const data = (await res.json()) as PatientApiRow;
        const normalized = normalizePatientDetail(data);
        setPatient(normalized);

        // On pre-remplit les champs avec les infos backend puis on surcharge si un JSON existe.
        setDiagnosis(normalized.condition);
        setPathologySummary(
          `Patient suivi pour ${normalized.condition}. Completer les details cliniques ici.`,
        );
        setAnalysesEditor("");
        setReportOutput(null);
        const baseClinical = toClinicalDataFromPatient(normalized);
        setIpp(baseClinical.ipp);
        setClinicalSex(baseClinical.sex);
        setBirthDateYear(toInputValue(baseClinical.birthDateYear));
        setBirthDateMonth(toInputValue(baseClinical.birthDateMonth));
        setDeathDateYear("");
        setDeathDateMonth("");
        setLastVisitDateYear(toInputValue(baseClinical.lastVisitDateYear));
        setLastVisitDateMonth(toInputValue(baseClinical.lastVisitDateMonth));
        setLastNewsDateYear(toInputValue(baseClinical.lastNewsDateYear));
        setLastNewsDateMonth(toInputValue(baseClinical.lastNewsDateMonth));
        setPrimaryCancerJson("[]");
        setSpecimenJson("[]");
        setMeasureJson("[]");
        setMedicationJson("[]");
        setSurgeryJson("[]");

        // 1) Base JSON statique (simulation locale)
        const jsonProfile = await loadPatientReportProfile(normalized.id);
        if (jsonProfile) {
          hydrateFormFromProfile(
            jsonProfile,
            `patient-reports/${normalized.id}.json`,
            { markAsPersisted: true },
          );
        }

        // 2) Profil persiste cote API (si disponible)
        try {
          const apiProfile = await fetchPatientProfileFromApi(normalized.id);
          if (apiProfile) {
            hydrateFormFromProfile(apiProfile, "API backend", {
              markAsPersisted: true,
            });
          }
        } catch {
          // Le fallback local prend le relais en cas d'indisponibilite API.
        }

        // 3) Draft local (prioritaire pour reprendre un travail manuel non publie)
        const localDraft = loadPatientProfileDraft(normalized.id);
        if (localDraft?.profile) {
          hydrateFormFromProfile(localDraft.profile, "localStorage", {
            markAsPersisted: false,
          });
          setLastSavedAt(localDraft.savedAt);
          setSyncState("idle");
        }

        isAutosaveReadyRef.current = true;
      } catch {
        setPatient(null);
      } finally {
        setListCachePreview(null);
        setIsLoading(false);
      }
    };

    void fetchPatient();
  }, [patientId]);

  const parsedClinicalSections = useMemo(() => {
    const baseData = {
      primaryCancer: [] as Record<string, unknown>[],
      biologicalSpecimenList: [] as Record<string, unknown>[],
      mesureList: [] as Record<string, unknown>[],
      medication: [] as Record<string, unknown>[],
      surgery: [] as Record<string, unknown>[],
    };
    const primaryCancer = parseJsonArraySection(primaryCancerJson, "Primary Cancer");
    if ("error" in primaryCancer) return { error: primaryCancer.error, data: baseData };
    const specimens = parseJsonArraySection(specimenJson, "Biological Specimen List");
    if ("error" in specimens) return { error: specimens.error, data: baseData };
    const measures = parseJsonArraySection(measureJson, "Mesure List");
    if ("error" in measures) return { error: measures.error, data: baseData };
    const medications = parseJsonArraySection(medicationJson, "Medication");
    if ("error" in medications) return { error: medications.error, data: baseData };
    const surgeries = parseJsonArraySection(surgeryJson, "Surgery");
    if ("error" in surgeries) return { error: surgeries.error, data: baseData };
    return {
      error: null as string | null,
      data: {
        primaryCancer: primaryCancer.data,
        biologicalSpecimenList: specimens.data,
        mesureList: measures.data,
        medication: medications.data,
        surgery: surgeries.data,
      },
    };
  }, [primaryCancerJson, specimenJson, measureJson, medicationJson, surgeryJson]);

  const currentProfile = useMemo<PatientReportProfile | null>(() => {
    if (!patient) return null;
    if (parsedClinicalSections.error) return null;

    const parsedAnalyses = parseAnalysesFromEditorText(analysesEditor);
    const diagnosisValue = diagnosis.trim() || patient.condition;
    const summaryValue =
      pathologySummary.trim() ||
      "Resume pathologique non renseigne. Utiliser le JSON ou la saisie manuelle.";
    const clinicalData: PatientClinicalData = {
      ipp: ipp.trim() || patient.mrn,
      birthDateYear: parseNullableInteger(birthDateYear),
      birthDateMonth: parseNullableInteger(birthDateMonth),
      sex: clinicalSex.trim() || patient.sex || "Non renseigne",
      deathDateYear: parseNullableInteger(deathDateYear),
      deathDateMonth: parseNullableInteger(deathDateMonth),
      lastVisitDateYear: parseNullableInteger(lastVisitDateYear),
      lastVisitDateMonth: parseNullableInteger(lastVisitDateMonth),
      lastNewsDateYear: parseNullableInteger(lastNewsDateYear),
      lastNewsDateMonth: parseNullableInteger(lastNewsDateMonth),
      medication: parsedClinicalSections.data.medication,
      surgery: parsedClinicalSections.data.surgery,
      primaryCancer: parsedClinicalSections.data.primaryCancer,
      biologicalSpecimenList: parsedClinicalSections.data.biologicalSpecimenList,
      mesureList: parsedClinicalSections.data.mesureList,
    };
    const reportAnalyses =
      parsedAnalyses.length > 0
        ? parsedAnalyses
        : analysesFromMeasureSection(clinicalData.mesureList);
    const report =
      reportOutput ||
      buildSimulatedAiReport({
        patientName: patient.name,
        diagnosis: diagnosisValue,
        pathologySummary: summaryValue,
        analyses: reportAnalyses,
      });

    return {
      schemaVersion: 2,
      profileVersion:
        typeof profileVersion === "number" ? profileVersion : undefined,
      patientId: patient.id,
      diagnosis: diagnosisValue,
      pathologySummary: summaryValue,
      analyses: reportAnalyses,
      report,
      clinicalData,
    };
  }, [
    patient,
    parsedClinicalSections,
    diagnosis,
    pathologySummary,
    analysesEditor,
    reportOutput,
    ipp,
    birthDateYear,
    birthDateMonth,
    clinicalSex,
    deathDateYear,
    deathDateMonth,
    lastVisitDateYear,
    lastVisitDateMonth,
    lastNewsDateYear,
    lastNewsDateMonth,
    profileVersion,
  ]);

  const handleGenerateReport = () => {
    if (!patient) return;
    if (parsedClinicalSections.error) {
      setInfoMessage(null);
      setErrorMessage(parsedClinicalSections.error);
      return;
    }
    if (!currentProfile) {
      setInfoMessage(null);
      setErrorMessage("Impossible de generer le report: donnees patient invalides.");
      return;
    }
    const generated = buildSimulatedAiReport({
      patientName: patient.name,
      diagnosis: currentProfile.diagnosis,
      pathologySummary: currentProfile.pathologySummary,
      analyses: currentProfile.analyses,
    });
    setReportOutput(generated);
    setInfoMessage("Rapport IA simule genere avec succes.");
    setErrorMessage(null);
    setSelectedTab("report");
  };

  useEffect(() => {
    if (!patient || !currentProfile) return;
    if (!isAutosaveReadyRef.current) return;
    if (isFormHydratingRef.current) return;

    const fingerprint = JSON.stringify(currentProfile);
    if (fingerprint === lastSyncedFingerprintRef.current) return;

    const timeoutId = window.setTimeout(() => {
      // Sauvegarde locale immediate (draft de travail).
      const draft = savePatientProfileDraft(patient.id, currentProfile);
      setLastSavedAt(draft.savedAt);
      setSyncState("saving");

      // Tentative de synchronisation API.
      void savePatientProfileToApi(patient.id, currentProfile)
        .then((savedProfile) => {
          if (savedProfile) {
            lastSyncedFingerprintRef.current = JSON.stringify(savedProfile);
            setProfileVersion(
              typeof savedProfile.profileVersion === "number"
                ? savedProfile.profileVersion
                : null,
            );
          } else {
            lastSyncedFingerprintRef.current = fingerprint;
          }
          setSyncState("saved");
          setLastSavedAt(new Date().toISOString());
        })
        .catch(() => {
          // On garde le draft local en cas d'erreur reseau/backend.
          setSyncState("error");
        });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [patient, currentProfile]);

  const openArgosDiscussion = () => {
    if (!patient) return;
    if (parsedClinicalSections.error) {
      setInfoMessage(null);
      setErrorMessage(parsedClinicalSections.error);
      return;
    }
    if (!currentProfile) {
      setInfoMessage(null);
      setErrorMessage("Impossible d'ouvrir ARGOS: profil patient incomplet.");
      return;
    }
    const contextMessage = buildArgosContextFromProfile(
      currentProfile,
      patient.name,
      patient.mrn,
    );
    navigate("/argos", {
      state: {
        patient: {
          id: patient.id,
          name: patient.name,
          age: typeof patient.age === "number" ? patient.age : 0,
          condition: currentProfile.diagnosis,
          mrn: patient.mrn,
          status: patient.status === "unknown" ? "active" : patient.status,
          contextProfile: currentProfile,
          contextMessage,
        },
      },
    });
  };

  const importLocalJsonProfile = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const normalized = normalizePatientReportProfile(payload, patient?.id);
      if (!normalized) {
        throw new Error(
          "Le JSON est invalide. Verifiez patientId ou ipp, et les sections cliniques (primaryCancer, biologicalSpecimenList, mesureList, report).",
        );
      }
      hydrateFormFromProfile(normalized, file.name, { markAsPersisted: false });
    } catch (error) {
      setInfoMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'importer ce JSON.",
      );
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            {listCachePreview
              ? "Chargement des donnees completes depuis la base de donnees..."
              : "Chargement du dossier patient..."}
          </p>
          {listCachePreview ? (
            <div className="max-w-xl rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Apercu (liste — cache navigateur)
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                {listCachePreview.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                MRN / IP : {listCachePreview.mrn}
              </p>
            </div>
          ) : null}
        </div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout>
        <div className="p-6">Patient introuvable.</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center gap-2 text-sm text-secondary hover:text-secondary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </button>

            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  {patient.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(patient.status)}`}
                  >
                    {patient.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {typeof patient.age === "number"
                      ? `${patient.age} ans`
                      : "Age non renseigne"}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {patient.mrn}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {patient.lastVisit
                      ? new Date(patient.lastVisit).toLocaleDateString("fr-FR")
                      : "Derniere visite non renseignee"}
                  </div>
                </div>
              </div>

              <Button variant="secondary" size="lg" onClick={openArgosDiscussion}>
                <Bot className="mr-2 h-5 w-5" />
                New ARGOS Discussion
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-auto">
              <TabsTrigger value="patient-info" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Patient Infos</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Report</span>
              </TabsTrigger>
              <TabsTrigger value="discussions" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>ARGOS</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patient-info" className="space-y-6">
              <Card className="overflow-hidden border-blue-200/60 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
                <CardHeader className="border-b border-blue-100/70">
                  <CardTitle className="text-xl">
                    Source des donnees patient
                  </CardTitle>
                  <CardDescription>
                    Vous pouvez charger un JSON preconfigure par patient, importer un
                    JSON local, ou saisir les informations manuellement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 bg-white/70">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => void loadProfileFromJsonFile(patient.id)}
                      disabled={isJsonLoading}
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      {isJsonLoading
                        ? "Chargement JSON..."
                        : `Charger patient-reports/${patient.id}.json`}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void importLocalJsonProfile(file);
                          event.target.value = "";
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Importer un JSON local
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        clearPatientProfileDraft(patient.id);
                        setInfoMessage("Draft local efface.");
                        setSyncState("idle");
                        setLastSavedAt(null);
                      }}
                    >
                      Effacer draft local
                    </Button>
                  </div>

                  {infoMessage && (
                    <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                      {infoMessage}
                    </div>
                  )}
                  {errorMessage && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {syncState === "saving" && "Synchronisation en cours..."}
                    {syncState === "saved" &&
                      `Profil synchronise${lastSavedAt ? ` (${new Date(lastSavedAt).toLocaleTimeString("fr-FR")})` : ""}.`}
                    {syncState === "error" &&
                      "Synchronisation API indisponible. Le draft local est conserve."}
                    {syncState === "idle" &&
                      (lastSavedAt
                        ? `Dernier draft local: ${new Date(lastSavedAt).toLocaleString("fr-FR")}`
                        : "Aucun draft local pour le moment.")}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-indigo-200/60 bg-gradient-to-br from-white via-violet-50/50 to-indigo-50/60 shadow-sm">
                <CardHeader className="border-b border-indigo-100/70">
                  <CardTitle className="text-xl">Patient Infos</CardTitle>
                  <CardDescription>
                    Informations cliniques pour ce patient (JSON ou saisie manuelle).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 bg-white/70">
                  {parsedClinicalSections.error && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive shadow-sm">
                      {parsedClinicalSections.error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-blue-200/60 bg-blue-50/70 p-3 text-xs text-blue-900">
                      <div className="font-semibold">Cancers primaires</div>
                      <div className="mt-1 text-lg font-bold">
                        {parsedClinicalSections.data.primaryCancer.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-3 text-xs text-amber-900">
                      <div className="font-semibold">Specimens</div>
                      <div className="mt-1 text-lg font-bold">
                        {parsedClinicalSections.data.biologicalSpecimenList.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                      <div className="font-semibold">Mesures</div>
                      <div className="mt-1 text-lg font-bold">
                        {parsedClinicalSections.data.mesureList.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-violet-200/60 bg-violet-50/70 p-3 text-xs text-violet-900">
                      <div className="font-semibold">Analyses report</div>
                      <div className="mt-1 text-lg font-bold">
                        {currentProfile?.analyses.length || 0}
                      </div>
                    </div>
                  </div>

                  <section className="space-y-3 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-blue-900">Section 1 - Identite et temporalite patient</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="ipp">IPP</Label>
                        <Input
                          id="ipp"
                          value={ipp}
                          onChange={(event) => setIpp(event.target.value)}
                          placeholder="Ex: arcane1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sex">Sexe</Label>
                        <Input
                          id="sex"
                          value={clinicalSex}
                          onChange={(event) => setClinicalSex(event.target.value)}
                          placeholder="MALE / FEMALE / OTHER"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth-year">Naissance annee</Label>
                        <Input
                          id="birth-year"
                          value={birthDateYear}
                          onChange={(event) => setBirthDateYear(event.target.value)}
                          placeholder="1962"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth-month">Naissance mois</Label>
                        <Input
                          id="birth-month"
                          value={birthDateMonth}
                          onChange={(event) => setBirthDateMonth(event.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="death-year">Deces annee</Label>
                        <Input
                          id="death-year"
                          value={deathDateYear}
                          onChange={(event) => setDeathDateYear(event.target.value)}
                          placeholder="2022"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="death-month">Deces mois</Label>
                        <Input
                          id="death-month"
                          value={deathDateMonth}
                          onChange={(event) => setDeathDateMonth(event.target.value)}
                          placeholder="3"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-visit-year">Derniere visite annee</Label>
                        <Input
                          id="last-visit-year"
                          value={lastVisitDateYear}
                          onChange={(event) => setLastVisitDateYear(event.target.value)}
                          placeholder="2022"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-visit-month">Derniere visite mois</Label>
                        <Input
                          id="last-visit-month"
                          value={lastVisitDateMonth}
                          onChange={(event) => setLastVisitDateMonth(event.target.value)}
                          placeholder="3"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-news-year">Dernieres nouvelles annee</Label>
                        <Input
                          id="last-news-year"
                          value={lastNewsDateYear}
                          onChange={(event) => setLastNewsDateYear(event.target.value)}
                          placeholder="2022"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-news-month">Dernieres nouvelles mois</Label>
                        <Input
                          id="last-news-month"
                          value={lastNewsDateMonth}
                          onChange={(event) => setLastNewsDateMonth(event.target.value)}
                          placeholder="3"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50/70 to-teal-50/50 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-cyan-900">Section 2 - Synthese clinique exploitable par le report IA</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="diagnosis">Pathologie principale</Label>
                        <Input
                          id="diagnosis"
                          value={diagnosis}
                          onChange={(event) => setDiagnosis(event.target.value)}
                          placeholder="Ex: Sarcome epithelioide localement avance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="patient-status">Statut patient (lecture backend)</Label>
                        <Input id="patient-status" value={patient.status} disabled />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pathology-summary">
                        Resume de la pathologie
                      </Label>
                      <Textarea
                        id="pathology-summary"
                        value={pathologySummary}
                        onChange={(event) => setPathologySummary(event.target.value)}
                        className="min-h-[130px]"
                        placeholder="Decrire le contexte pathologique, stade, evolution, facteurs de risque..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="analyses">
                        Resultats d'analyses (1 ligne = Nom | Valeur | Unite | Reference | Date)
                      </Label>
                      <Textarea
                        id="analyses"
                        value={analysesEditor}
                        onChange={(event) => setAnalysesEditor(event.target.value)}
                        className="min-h-[180px] font-mono text-xs"
                        placeholder="LDH | 512 | U/L | 125-220 | 2026-03-12"
                      />
                    </div>
                  </section>

                  <section className="space-y-2 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/70 to-purple-50/40 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-violet-900">Section 3 - Cancers primaires (JSON editable)</h3>
                    <p className="text-xs text-muted-foreground">
                      Collez ici un tableau JSON correspondant a `primaryCancer`.
                    </p>
                    <Textarea
                      value={primaryCancerJson}
                      onChange={(event) => setPrimaryCancerJson(event.target.value)}
                      className="min-h-[220px] border-dashed bg-white/80 font-mono text-xs"
                    />
                  </section>

                  <section className="space-y-2 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/70 to-yellow-50/40 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-amber-900">Section 4 - Specimens biologiques (JSON editable)</h3>
                    <p className="text-xs text-muted-foreground">
                      Collez ici un tableau JSON correspondant a `biologicalSpecimenList`.
                    </p>
                    <Textarea
                      value={specimenJson}
                      onChange={(event) => setSpecimenJson(event.target.value)}
                      className="min-h-[220px] border-dashed bg-white/80 font-mono text-xs"
                    />
                  </section>

                  <section className="space-y-2 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 to-green-50/40 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-emerald-900">Section 5 - Mesures cliniques (JSON editable)</h3>
                    <p className="text-xs text-muted-foreground">
                      Collez ici un tableau JSON correspondant a `mesureList`.
                    </p>
                    <Textarea
                      value={measureJson}
                      onChange={(event) => setMeasureJson(event.target.value)}
                      className="min-h-[220px] border-dashed bg-white/80 font-mono text-xs"
                    />
                  </section>

                  <section className="space-y-3 rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50/70 to-pink-50/40 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-rose-900">Section 6 - Traitements et gestes (JSON editable)</h3>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="medication-json">Medication</Label>
                        <Textarea
                          id="medication-json"
                          value={medicationJson}
                          onChange={(event) => setMedicationJson(event.target.value)}
                          className="min-h-[180px] border-dashed bg-white/80 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="surgery-json">Surgery</Label>
                        <Textarea
                          id="surgery-json"
                          value={surgeryJson}
                          onChange={(event) => setSurgeryJson(event.target.value)}
                          className="min-h-[180px] border-dashed bg-white/80 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </section>

                  <div className="sticky bottom-4 z-10 flex flex-wrap gap-3 rounded-2xl border border-primary/20 bg-background/90 p-3 backdrop-blur">
                    <Button onClick={handleGenerateReport}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                    <Button variant="secondary" onClick={openArgosDiscussion}>
                      <Bot className="mr-2 h-4 w-4" />
                      Envoyer le contexte vers ARGOS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="space-y-6">
              {reportOutput ? (
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conclusion IA</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="min-h-[220px] whitespace-pre-line rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed">
                        {reportOutput.conclusion}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Raisonnement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="min-h-[220px] whitespace-pre-line rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed">
                        {reportOutput.reasoning}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="min-h-[220px] rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed">
                        <ul className="list-disc space-y-2 pl-5">
                          {reportOutput.sources.map((source, index) => (
                            <li key={`${source}-${index}`}>{source}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setSelectedTab("patient-info")}>
                      Retour a Patient Infos
                    </Button>
                    <Button onClick={openArgosDiscussion}>
                      <Bot className="mr-2 h-4 w-4" />
                      Ouvrir dans ARGOS
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                  <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    Aucun rapport genere pour le moment.
                  </p>
                  <Button className="mt-4" onClick={() => setSelectedTab("patient-info")}>
                    Aller sur Patient Infos
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="discussions" className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Ouvrez ARGOS pour demarrer une discussion avec le contexte patient.
                </p>
                <Button className="mt-4" onClick={openArgosDiscussion}>
                  <Bot className="mr-2 h-4 w-4" />
                  Start New Discussion
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

