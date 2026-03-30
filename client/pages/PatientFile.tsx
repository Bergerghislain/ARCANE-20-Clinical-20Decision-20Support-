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
import {
  analysesToEditorText,
  buildArgosContextFromProfile,
  buildSimulatedAiReport,
  loadPatientReportProfile,
  normalizePatientReportProfile,
  parseAnalysesFromEditorText,
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

export default function PatientFile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFormHydratingRef = useRef(false);
  const isAutosaveReadyRef = useRef(false);
  const lastSyncedFingerprintRef = useRef<string | null>(null);

  const [patient, setPatient] = useState<PatientViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJsonLoading, setIsJsonLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("patient-info");

  const [diagnosis, setDiagnosis] = useState("");
  const [pathologySummary, setPathologySummary] = useState("");
  const [analysesEditor, setAnalysesEditor] = useState("");
  const [reportOutput, setReportOutput] = useState<SimulatedIaReport | null>(null);

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
      setIsLoading(true);
      setInfoMessage(null);
      setErrorMessage(null);
      setSyncState("idle");
      setLastSavedAt(null);
      isAutosaveReadyRef.current = false;
      lastSyncedFingerprintRef.current = null;
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
        setIsLoading(false);
      }
    };

    void fetchPatient();
  }, [patientId]);

  const currentProfile = useMemo<PatientReportProfile | null>(() => {
    if (!patient) return null;

    const parsedAnalyses = parseAnalysesFromEditorText(analysesEditor);
    const diagnosisValue = diagnosis.trim() || patient.condition;
    const summaryValue =
      pathologySummary.trim() ||
      "Resume pathologique non renseigne. Utiliser le JSON ou la saisie manuelle.";
    const report =
      reportOutput ||
      buildSimulatedAiReport({
        patientName: patient.name,
        diagnosis: diagnosisValue,
        pathologySummary: summaryValue,
        analyses: parsedAnalyses,
      });

    return {
      schemaVersion: 1,
      patientId: patient.id,
      diagnosis: diagnosisValue,
      pathologySummary: summaryValue,
      analyses: parsedAnalyses,
      report,
    };
  }, [patient, diagnosis, pathologySummary, analysesEditor, reportOutput]);

  const handleGenerateReport = () => {
    if (!patient) return;
    const generated = buildSimulatedAiReport({
      patientName: patient.name,
      diagnosis: diagnosis.trim() || patient.condition,
      pathologySummary: pathologySummary.trim(),
      analyses: parseAnalysesFromEditorText(analysesEditor),
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
    if (!patient || !currentProfile) return;
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
          "Le JSON est invalide. Verifiez patientId, pathology, analyses et report.",
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
        <div className="p-6">Chargement du dossier patient...</div>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Source des donnees patient
                  </CardTitle>
                  <CardDescription>
                    Vous pouvez charger un JSON preconfigure par patient, importer un
                    JSON local, ou saisir les informations manuellement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Patient Infos</CardTitle>
                  <CardDescription>
                    Informations cliniques pour ce patient (JSON ou saisie manuelle).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
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
                      <Label htmlFor="sex">Sexe (lecture backend)</Label>
                      <Input id="sex" value={patient.sex} disabled />
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

                  <div className="flex flex-wrap gap-3">
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

