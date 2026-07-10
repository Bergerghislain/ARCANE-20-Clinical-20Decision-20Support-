import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import {
  extractPartialJsonString,
  hasPartialJsonField,
} from "@/lib/aiStreamPartialJson";
import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import {
  fetchPatientProfileFromApi,
  savePatientProfileToApi,
} from "@/lib/patientProfileApi";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { invalidatePatient } from "@/lib/queryInvalidation";
import {
  clearPatientProfileDraft,
  loadPatientProfileDraft,
  savePatientProfileDraft,
} from "@/lib/patientProfileStorage";
import {
  analysesToEditorText,
  buildArgosContextFromProfile,
  buildSimulatedAiReport,
  loadPatientReportProfile,
  normalizePatientReportProfile,
  parseAnalysesFromEditorText,
  type PatientClinicalData,
  type PatientReportProfile,
  type SimulatedIaReport,
} from "@/lib/patientReport";
import {
  analysesFromMeasureSection,
  applyClinicalBundleToForm,
  formatJsonArray,
  parseJsonArraySection,
  parseNullableInteger,
  toClinicalDataFromPatient,
  toInputValue,
  type PatientViewModel,
} from "@/lib/patientFileModel";

export function usePatientReport(
  patient: PatientViewModel | null,
  clinicalBundle: PatientClinicalBundle | null,
  navigate: NavigateFunction,
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFormHydratingRef = useRef(false);
  const isAutosaveReadyRef = useRef(false);
  const lastSyncedFingerprintRef = useRef<string | null>(null);

  const [selectedPatientSection, setSelectedPatientSection] = useState("clinical");
  const [diagnosis, setDiagnosis] = useState("");
  const [pathologySummary, setPathologySummary] = useState("");
  const [analysesEditor, setAnalysesEditor] = useState("");
  const [reportOutput, setReportOutput] = useState<SimulatedIaReport | null>(null);
  const [reportReflection, setReportReflection] = useState("");
  const [reportStreamRaw, setReportStreamRaw] = useState("");
  const [isReportStreaming, setIsReportStreaming] = useState(false);
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
  const [profileDataSource, setProfileDataSource] = useState<
    "api" | "local-draft" | "json-file" | "none"
  >("none");
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isJsonLoading, setIsJsonLoading] = useState(false);

  const clinicalFormSetters = {
    setIpp,
    setClinicalSex,
    setBirthDateYear,
    setBirthDateMonth,
    setDeathDateYear,
    setDeathDateMonth,
    setLastVisitDateYear,
    setLastVisitDateMonth,
    setLastNewsDateYear,
    setLastNewsDateMonth,
    setPrimaryCancerJson,
    setSpecimenJson,
    setMeasureJson,
    setMedicationJson,
    setSurgeryJson,
  };

  const resetProfileFormFromPatient = (normalized: PatientViewModel) => {
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
    setProfileVersion(null);
    setInfoMessage(null);
    setErrorMessage(null);
    setSyncState("idle");
    setLastSavedAt(null);
    isAutosaveReadyRef.current = false;
    lastSyncedFingerprintRef.current = null;
  };

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
    const fallbackClinical: PatientClinicalData = patient
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
      if (sourceLabel === "API backend") {
        setProfileDataSource("api");
        setHasLocalDraft(false);
      } else if (sourceLabel.startsWith("patient-reports/")) {
        setProfileDataSource("json-file");
      }
    } else if (sourceLabel === "localStorage") {
      setProfileDataSource("local-draft");
      setHasLocalDraft(true);
    }
    window.setTimeout(() => {
      isFormHydratingRef.current = false;
    }, 0);
  };

  const loadProfilesForPatient = async (normalized: PatientViewModel) => {
    setProfileDataSource("none");
    setHasLocalDraft(false);

    const jsonProfile = await loadPatientReportProfile(normalized.id);
    if (jsonProfile) {
      hydrateFormFromProfile(jsonProfile, `patient-reports/${normalized.id}.json`, {
        markAsPersisted: true,
      });
    }

    try {
      const apiProfile = await queryClient.fetchQuery({
        queryKey: queryKeys.patients.profile(normalized.id),
        queryFn: () => fetchPatientProfileFromApi(normalized.id),
      });
      if (apiProfile) {
        hydrateFormFromProfile(apiProfile, "API backend", { markAsPersisted: true });
      }
    } catch {
      // Fallback local si API indisponible.
    }

    const localDraft = loadPatientProfileDraft(normalized.id);
    if (localDraft?.profile) {
      hydrateFormFromProfile(localDraft.profile, "localStorage", {
        markAsPersisted: false,
      });
      setLastSavedAt(localDraft.savedAt);
      setSyncState("idle");
    }

    isAutosaveReadyRef.current = true;
  };

  const profileSyncStatus = useMemo(() => {
    if (syncState === "saving") return "saving" as const;
    if (syncState === "error") return "sync-error" as const;
    if (hasLocalDraft || profileDataSource === "local-draft") {
      return "local-draft" as const;
    }
    if (
      syncState === "saved" ||
      profileDataSource === "api" ||
      profileDataSource === "json-file"
    ) {
      return "synced" as const;
    }
    return null;
  }, [syncState, profileDataSource, hasLocalDraft]);

  useEffect(() => {
    if (!patient) return;
    resetProfileFormFromPatient(patient);
    void loadProfilesForPatient(patient);
  }, [patient?.id]);

  useEffect(() => {
    if (!clinicalBundle) return;
    const hasStructuredData =
      (clinicalBundle.mesureList?.length ?? 0) > 0 ||
      (clinicalBundle.biologicalSpecimenList?.length ?? 0) > 0 ||
      (clinicalBundle.primaryCancer?.length ?? 0) > 0 ||
      (clinicalBundle.medication?.length ?? 0) > 0 ||
      (clinicalBundle.surgery?.length ?? 0) > 0;
    if (!hasStructuredData) return;

    applyClinicalBundleToForm(clinicalBundle, clinicalFormSetters);
    setInfoMessage("Donnees cliniques structurees chargees depuis PostgreSQL.");
  }, [clinicalBundle]);

  const parsedClinicalSections = useMemo(() => {
    const baseData = {
      primaryCancer: [] as Record<string, unknown>[],
      biologicalSpecimenList: [] as Record<string, unknown>[],
      mesureList: [] as Record<string, unknown>[],
      medication: [] as Record<string, unknown>[],
      surgery: [] as Record<string, unknown>[],
    };
    const primaryCancer = parseJsonArraySection(primaryCancerJson, "primaryCancer");
    if (!primaryCancer.ok) return { error: primaryCancer.error, data: baseData };
    const specimens = parseJsonArraySection(specimenJson, "biologicalSpecimenList");
    if (!specimens.ok) return { error: specimens.error, data: baseData };
    const measures = parseJsonArraySection(measureJson, "mesureList");
    if (!measures.ok) return { error: measures.error, data: baseData };
    const medications = parseJsonArraySection(medicationJson, "medication");
    if (!medications.ok) return { error: medications.error, data: baseData };
    const surgeries = parseJsonArraySection(surgeryJson, "surgery");
    if (!surgeries.ok) return { error: surgeries.error, data: baseData };
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

  const handleGenerateReport = async (onTabChange: (tab: string) => void) => {
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
    setSyncState("saving");
    setInfoMessage(null);
    setErrorMessage(null);
    setReportStreamRaw("");
    setReportReflection("");
    setIsReportStreaming(true);
    try {
      const res = await apiFetch("/api/ai/report/stream", {
        method: "POST",
        body: JSON.stringify({
          patient_name: patient.name,
          patient_mrn: patient.mrn,
          profile: currentProfile,
        }),
      });
      if (!res.ok || !res.body) throw new Error("IA indisponible");

      onTabChange("report");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let jsonText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const idx = buffer.indexOf("\n");
          if (idx === -1) break;
          const line = buffer.slice(0, idx).trimEnd();
          buffer = buffer.slice(idx + 1);

          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            buffer = "";
            break;
          }
          try {
            const chunk = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = chunk?.choices?.[0]?.delta?.content ?? "";
            if (typeof delta === "string" && delta) {
              jsonText += delta;
              setReportStreamRaw(jsonText);
              setReportReflection(extractPartialJsonString(jsonText, "reflection"));
              const hasResult =
                hasPartialJsonField(jsonText, "conclusion") ||
                hasPartialJsonField(jsonText, "reasoning");
              if (!hasResult) {
                continue;
              }
              try {
                const parsed = JSON.parse(jsonText) as {
                  conclusion?: string;
                  reasoning?: string;
                  sources?: unknown[];
                };
                if (parsed && typeof parsed === "object") {
                  const maybe: SimulatedIaReport = {
                    conclusion: String(parsed.conclusion ?? ""),
                    reasoning: String(parsed.reasoning ?? ""),
                    sources: Array.isArray(parsed.sources)
                      ? parsed.sources.map((s) => String(s))
                      : [],
                  };
                  if (maybe.conclusion || maybe.reasoning || maybe.sources.length) {
                    setReportOutput(maybe);
                  }
                }
              } catch {
                const maybe: SimulatedIaReport = {
                  conclusion: extractPartialJsonString(jsonText, "conclusion"),
                  reasoning: extractPartialJsonString(jsonText, "reasoning"),
                  sources: [],
                };
                if (maybe.conclusion || maybe.reasoning) {
                  setReportOutput(maybe);
                }
              }
            }
          } catch {
            // Chunk non JSON ignoré.
          }
        }
      }

      const finalParsed = JSON.parse(jsonText) as {
        reflection?: string;
        conclusion?: string;
        reasoning?: string;
        sources?: unknown[];
      };
      setReportReflection(String(finalParsed?.reflection ?? reportReflection));
      const finalReport: SimulatedIaReport = {
        conclusion: String(finalParsed?.conclusion ?? ""),
        reasoning: String(finalParsed?.reasoning ?? ""),
        sources: Array.isArray(finalParsed?.sources)
          ? finalParsed.sources.map((s) => String(s))
          : [],
      };
      setReportOutput(finalReport);
      setInfoMessage("Rapport IA genere via Qwen (streaming) avec succes.");
      setErrorMessage(null);
      setSyncState("saved");
    } catch {
      const generated = buildSimulatedAiReport({
        patientName: patient.name,
        diagnosis: currentProfile.diagnosis,
        pathologySummary: currentProfile.pathologySummary,
        analyses: currentProfile.analyses,
      });
      setReportOutput(generated);
      setInfoMessage(
        "Rapport IA simule (fallback local). Configurez Qwen pour activer l'IA.",
      );
      onTabChange("report");
      setSyncState("idle");
    } finally {
      setIsReportStreaming(false);
    }
  };

  useEffect(() => {
    if (!patient || !currentProfile) return;
    if (!isAutosaveReadyRef.current) return;
    if (isFormHydratingRef.current) return;

    const fingerprint = JSON.stringify(currentProfile);
    if (fingerprint === lastSyncedFingerprintRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const draft = savePatientProfileDraft(patient.id, currentProfile);
      setLastSavedAt(draft.savedAt);
      setSyncState("saving");

      void savePatientProfileToApi(patient.id, currentProfile)
        .then((savedProfile) => {
          if (savedProfile) {
            lastSyncedFingerprintRef.current = JSON.stringify(savedProfile);
            setProfileVersion(
              typeof savedProfile.profileVersion === "number"
                ? savedProfile.profileVersion
                : null,
            );
            setProfileDataSource("api");
            setHasLocalDraft(false);
          } else {
            lastSyncedFingerprintRef.current = fingerprint;
          }
          setSyncState("saved");
          setLastSavedAt(new Date().toISOString());
          void invalidatePatient(patient.id);
        })
        .catch(() => {
          setSyncState("error");
          setHasLocalDraft(true);
          setProfileDataSource("local-draft");
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

  const loadProfileFromJsonFile = async (id: string) => {
    setIsJsonLoading(true);
    try {
      const profile = await loadPatientReportProfile(id);
      if (!profile) {
        setInfoMessage(null);
        setErrorMessage(
          `Aucun fichier JSON trouve pour le patient ${id} (public/patient-reports/${id}.json).`,
        );
        return;
      }
      hydrateFormFromProfile(profile, `patient-reports/${id}.json`, {
        markAsPersisted: true,
      });
    } catch (error) {
      setInfoMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Echec du chargement JSON patient.",
      );
    } finally {
      setIsJsonLoading(false);
    }
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

  const clearLocalDraft = () => {
    if (!patient) return;
    clearPatientProfileDraft(patient.id);
    setHasLocalDraft(false);
    void (async () => {
      try {
        const apiProfile = await fetchPatientProfileFromApi(patient.id);
        if (apiProfile) {
          hydrateFormFromProfile(apiProfile, "API backend", { markAsPersisted: true });
          setInfoMessage("Brouillon local effacé. Profil serveur rechargé.");
          return;
        }
      } catch {
        // Pas de profil API : on garde le formulaire tel quel.
      }
      setProfileDataSource("none");
      setSyncState("idle");
      setLastSavedAt(null);
      setInfoMessage("Brouillon local effacé.");
    })();
  };

  return {
    fileInputRef,
    selectedPatientSection,
    setSelectedPatientSection,
    diagnosis,
    setDiagnosis,
    pathologySummary,
    setPathologySummary,
    analysesEditor,
    setAnalysesEditor,
    ipp,
    setIpp,
    clinicalSex,
    setClinicalSex,
    birthDateYear,
    setBirthDateYear,
    birthDateMonth,
    setBirthDateMonth,
    deathDateYear,
    setDeathDateYear,
    deathDateMonth,
    setDeathDateMonth,
    lastVisitDateYear,
    setLastVisitDateYear,
    lastVisitDateMonth,
    setLastVisitDateMonth,
    lastNewsDateYear,
    setLastNewsDateYear,
    lastNewsDateMonth,
    setLastNewsDateMonth,
    primaryCancerJson,
    setPrimaryCancerJson,
    specimenJson,
    setSpecimenJson,
    measureJson,
    setMeasureJson,
    medicationJson,
    setMedicationJson,
    surgeryJson,
    setSurgeryJson,
    infoMessage,
    errorMessage,
    syncState,
    profileSyncStatus,
    profileDataSource,
    hasLocalDraft,
    lastSavedAt,
    isJsonLoading,
    parsedClinicalSections,
    currentProfile,
    reportOutput,
    reportReflection,
    reportStreamRaw,
    isReportStreaming,
    handleGenerateReport,
    openArgosDiscussion,
    loadProfileFromJsonFile,
    importLocalJsonProfile,
    clearLocalDraft,
  };
}

export type UsePatientReportReturn = ReturnType<typeof usePatientReport>;
