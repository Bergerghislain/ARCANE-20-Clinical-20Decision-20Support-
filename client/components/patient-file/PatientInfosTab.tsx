import { FileJson, Sparkles, Upload } from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClinicalIdentityBanner } from "@/components/patient-clinical/ClinicalIdentityBanner";
import { ClinicalJsonExpertPanel } from "@/components/patient-clinical/ClinicalJsonExpertPanel";
import { MeasuresClinicalSection } from "@/components/patient-clinical/MeasuresClinicalSection";
import { PrimaryCancerClinicalSection } from "@/components/patient-clinical/PrimaryCancerClinicalSection";
import { SpecimensClinicalSection } from "@/components/patient-clinical/SpecimensClinicalSection";
import { TreatmentsClinicalSection } from "@/components/patient-clinical/TreatmentsClinicalSection";
import { ArgosContextButton } from "@/components/patient-file/ArgosTabLink";
import { fr } from "@/lib/i18n/fr";
import { ProfileSyncStatusBadge } from "@/components/patient-file/ProfileSyncStatusBadge";
import type { UsePatientReportReturn } from "@/hooks/usePatientReport";
import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import type { PatientViewModel } from "@/lib/patientFileModel";

interface PatientInfosTabProps {
  patient: PatientViewModel;
  patientId: string | undefined;
  clinicalBundle: PatientClinicalBundle | null;
  isClinicalLoading: boolean;
  clinicalError: string | null;
  reloadClinicalBundle: () => void | Promise<void>;
  report: UsePatientReportReturn;
  onGenerateReport: () => void;
  onOpenArgos: () => void;
}

function SectionActions({
  onGenerateReport,
  onOpenArgos,
}: {
  onGenerateReport: () => void;
  onOpenArgos: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap gap-3 rounded-2xl border border-primary/20 bg-background/90 p-3 backdrop-blur">
      <Button onClick={onGenerateReport}>
        <Sparkles className="mr-2 h-4 w-4" />
        {fr.patientFile.generateReport}
      </Button>
      <ArgosContextButton onOpenDiscussion={onOpenArgos} />
    </div>
  );
}

export function PatientInfosTab({
  patient,
  patientId,
  clinicalBundle,
  isClinicalLoading,
  clinicalError,
  reloadClinicalBundle,
  report,
  onGenerateReport,
  onOpenArgos,
}: PatientInfosTabProps) {
  const {
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
    profileSyncStatus,
    profileDataSource,
    hasLocalDraft,
    lastSavedAt,
    isJsonLoading,
    parsedClinicalSections,
    currentProfile,
    loadProfileFromJsonFile,
    importLocalJsonProfile,
    clearLocalDraft,
  } = report;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-blue-200/60 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
        <CardHeader className="border-b border-blue-100/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Source des donnees patient</CardTitle>
              <CardDescription>
                Vous pouvez charger un JSON preconfigure par patient, importer un JSON local,
                ou saisir les informations manuellement.
              </CardDescription>
            </div>
            {profileSyncStatus && (
              <ProfileSyncStatusBadge
                status={profileSyncStatus}
                lastSavedAt={lastSavedAt}
              />
            )}
          </div>
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
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Importer un JSON local
            </Button>
            <Button variant="ghost" onClick={clearLocalDraft} disabled={!hasLocalDraft}>
              Effacer brouillon local
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {profileDataSource === "local-draft" || hasLocalDraft
              ? "Le brouillon local est affiche en priorite sur le profil serveur (ADR-006). Effacez-le pour recharger l'API."
              : "Le profil affiche provient du serveur ou d'un fichier JSON charge."}
          </p>

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
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-indigo-200/60 bg-gradient-to-br from-white via-violet-50/50 to-indigo-50/60 shadow-sm">
        <CardHeader className="border-b border-indigo-100/70">
          <CardTitle className="text-xl">Dossier patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 bg-white/70">
          {parsedClinicalSections.error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive shadow-sm">
              {parsedClinicalSections.error}
            </div>
          )}

          <Tabs
            value={selectedPatientSection}
            onValueChange={setSelectedPatientSection}
            className="w-full"
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="lg:sticky lg:top-6 lg:self-start">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 p-1 lg:flex lg:flex-col lg:items-stretch lg:justify-start">
                  <TabsTrigger value="identity" className="justify-start">
                    Identite
                  </TabsTrigger>
                  <TabsTrigger value="clinical" className="justify-start">
                    Synthese
                  </TabsTrigger>
                  <TabsTrigger value="primaryCancer" className="justify-start">
                    Cancers / TNM
                  </TabsTrigger>
                  <TabsTrigger value="specimens" className="justify-start">
                    Prélèvements
                  </TabsTrigger>
                  <TabsTrigger value="measures" className="justify-start">
                    Mesures
                  </TabsTrigger>
                  <TabsTrigger value="treatments" className="justify-start">
                    Traitements
                  </TabsTrigger>
                </TabsList>
              </aside>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-blue-200/60 bg-blue-50/70 p-3 text-xs text-blue-900">
                    <div className="font-semibold">primaryCancer</div>
                    <div className="mt-1 text-lg font-bold">
                      {parsedClinicalSections.data.primaryCancer.length}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-3 text-xs text-amber-900">
                    <div className="font-semibold">biologicalSpecimenList</div>
                    <div className="mt-1 text-lg font-bold">
                      {parsedClinicalSections.data.biologicalSpecimenList.length}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                    <div className="font-semibold">mesureList</div>
                    <div className="mt-1 text-lg font-bold">
                      {parsedClinicalSections.data.mesureList.length}
                    </div>
                  </div>
                  <div className="rounded-xl border border-violet-200/60 bg-violet-50/70 p-3 text-xs text-violet-900">
                    <div className="font-semibold">analyses (report)</div>
                    <div className="mt-1 text-lg font-bold">
                      {currentProfile?.analyses.length || 0}
                    </div>
                  </div>
                </div>

                <ClinicalIdentityBanner bundle={clinicalBundle} />

                <TabsContent value="identity" className="m-0 space-y-6">
                  <section className="space-y-3 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-blue-900">
                      Identite & temporalite
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="ipp">IPP</Label>
                        <Input id="ipp" value={ipp} onChange={(e) => setIpp(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sex">Sexe</Label>
                        <Input
                          id="sex"
                          value={clinicalSex}
                          onChange={(e) => setClinicalSex(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth-year">Naissance annee</Label>
                        <Input
                          id="birth-year"
                          value={birthDateYear}
                          onChange={(e) => setBirthDateYear(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth-month">Naissance mois</Label>
                        <Input
                          id="birth-month"
                          value={birthDateMonth}
                          onChange={(e) => setBirthDateMonth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="death-year">Deces annee</Label>
                        <Input
                          id="death-year"
                          value={deathDateYear}
                          onChange={(e) => setDeathDateYear(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="death-month">Deces mois</Label>
                        <Input
                          id="death-month"
                          value={deathDateMonth}
                          onChange={(e) => setDeathDateMonth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-visit-year">Derniere visite annee</Label>
                        <Input
                          id="last-visit-year"
                          value={lastVisitDateYear}
                          onChange={(e) => setLastVisitDateYear(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-visit-month">Derniere visite mois</Label>
                        <Input
                          id="last-visit-month"
                          value={lastVisitDateMonth}
                          onChange={(e) => setLastVisitDateMonth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-news-year">Dernieres nouvelles annee</Label>
                        <Input
                          id="last-news-year"
                          value={lastNewsDateYear}
                          onChange={(e) => setLastNewsDateYear(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-news-month">Dernieres nouvelles mois</Label>
                        <Input
                          id="last-news-month"
                          value={lastNewsDateMonth}
                          onChange={(e) => setLastNewsDateMonth(e.target.value)}
                        />
                      </div>
                    </div>
                  </section>
                  <SectionActions
                    onGenerateReport={onGenerateReport}
                    onOpenArgos={onOpenArgos}
                  />
                </TabsContent>

                <TabsContent value="clinical" className="m-0 space-y-6">
                  <section className="space-y-3 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50/70 to-teal-50/50 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-cyan-900">
                      Synthese (pour report)
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="diagnosis">Pathologie principale</Label>
                        <Input
                          id="diagnosis"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="patient-status">Statut patient (lecture backend)</Label>
                        <Input id="patient-status" value={patient.status} disabled />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pathology-summary">Resume de la pathologie</Label>
                      <Textarea
                        id="pathology-summary"
                        value={pathologySummary}
                        onChange={(e) => setPathologySummary(e.target.value)}
                        className="min-h-[130px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="analyses">
                        Resultats d&apos;analyses (1 ligne = Nom | Valeur | Unite | Reference |
                        Date)
                      </Label>
                      <Textarea
                        id="analyses"
                        value={analysesEditor}
                        onChange={(e) => setAnalysesEditor(e.target.value)}
                        className="min-h-[180px] font-mono text-xs"
                      />
                    </div>
                  </section>
                  <SectionActions
                    onGenerateReport={onGenerateReport}
                    onOpenArgos={onOpenArgos}
                  />
                </TabsContent>

                <TabsContent value="primaryCancer" className="m-0 space-y-6">
                  <PrimaryCancerClinicalSection
                    bundle={clinicalBundle}
                    isLoading={isClinicalLoading}
                    error={clinicalError}
                  />
                  <ClinicalJsonExpertPanel
                    label="Édition JSON (primaryCancer)"
                    codeHint="primaryCancer"
                    value={primaryCancerJson}
                    onChange={setPrimaryCancerJson}
                  />
                  <SectionActions
                    onGenerateReport={onGenerateReport}
                    onOpenArgos={onOpenArgos}
                  />
                </TabsContent>

                <TabsContent value="specimens" className="m-0 space-y-6">
                  <SpecimensClinicalSection
                    bundle={clinicalBundle}
                    isLoading={isClinicalLoading}
                    error={clinicalError}
                  />
                  <ClinicalJsonExpertPanel
                    label="Édition JSON (biologicalSpecimenList)"
                    codeHint="biologicalSpecimenList"
                    value={specimenJson}
                    onChange={setSpecimenJson}
                  />
                  <SectionActions
                    onGenerateReport={onGenerateReport}
                    onOpenArgos={onOpenArgos}
                  />
                </TabsContent>

                <TabsContent value="measures" className="m-0 space-y-6">
                  <MeasuresClinicalSection
                    bundle={clinicalBundle}
                    patientId={patientId}
                    onRefresh={async () => {
                      await reloadClinicalBundle();
                    }}
                    isLoading={isClinicalLoading}
                    error={clinicalError}
                  />
                  <ClinicalJsonExpertPanel
                    label="Édition JSON (mesureList)"
                    codeHint="mesureList"
                    value={measureJson}
                    onChange={setMeasureJson}
                  />
                  <SectionActions
                    onGenerateReport={onGenerateReport}
                    onOpenArgos={onOpenArgos}
                  />
                </TabsContent>

                <TabsContent value="treatments" className="m-0 space-y-6">
                  <TreatmentsClinicalSection
                    bundle={clinicalBundle}
                    isLoading={isClinicalLoading}
                    error={clinicalError}
                  />
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <ClinicalJsonExpertPanel
                      label="Édition JSON (medication)"
                      codeHint="medication"
                      value={medicationJson}
                      onChange={setMedicationJson}
                    />
                    <ClinicalJsonExpertPanel
                      label="Édition JSON (surgery)"
                      codeHint="surgery"
                      value={surgeryJson}
                      onChange={setSurgeryJson}
                    />
                  </div>
                  <SectionActions
                    onGenerateReport={onGenerateReport}
                    onOpenArgos={onOpenArgos}
                  />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
