import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, MessageSquare, Sparkles, User } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArgosHeaderButton,
  ArgosTabLink,
} from "@/components/patient-file/ArgosTabLink";
import { PatientInfosTab } from "@/components/patient-file/PatientInfosTab";
import { ReportTab } from "@/components/patient-file/ReportTab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { usePatientClinicalBundle } from "@/hooks/usePatientClinicalBundle";
import { usePatientDetailQuery } from "@/hooks/queries/usePatientDetailQuery";
import { usePatientReport } from "@/hooks/usePatientReport";
import { findPatientRowInListCache } from "@/lib/dashboardPatientsCache";
import { fr } from "@/lib/i18n/fr";
import {
  getStatusStyle,
  normalizePatientDetail,
  type PatientApiRow,
  type PatientViewModel,
} from "@/lib/patientFileModel";

export default function PatientFile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const {
    data: clinicalBundle,
    isLoading: isClinicalLoading,
    error: clinicalError,
    reload: reloadClinicalBundle,
  } = usePatientClinicalBundle(patientId);

  const {
    data: patient,
    isLoading,
    isFetching,
  } = usePatientDetailQuery(patientId);

  const [listCachePreview, setListCachePreview] = useState<PatientViewModel | null>(null);
  const [selectedTab, setSelectedTab] = useState("patient-info");

  const report = usePatientReport(patient ?? null, clinicalBundle, navigate);

  useEffect(() => {
    if (!patientId) {
      setListCachePreview(null);
      return;
    }
    const fromList = findPatientRowInListCache(patientId);
    if (!fromList || patient) {
      setListCachePreview(null);
      return;
    }
    try {
      setListCachePreview(normalizePatientDetail(fromList as PatientApiRow));
    } catch {
      setListCachePreview(null);
    }
  }, [patientId, patient]);

  const showLoading = isLoading || (isFetching && !patient);

  if (showLoading) {
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

  const onGenerateReport = () => {
    void report.handleGenerateReport(setSelectedTab);
  };

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
                <h1 className="text-3xl font-bold text-primary">{patient.name}</h1>
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

              <ArgosHeaderButton onOpenDiscussion={report.openArgosDiscussion} />
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
                <span>{fr.patientFile.tabInfos}</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>{fr.patientFile.tabReport}</span>
              </TabsTrigger>
              <TabsTrigger value="discussions" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>ARGOS</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patient-info" className="space-y-6">
              <PatientInfosTab
                patient={patient}
                patientId={patientId}
                clinicalBundle={clinicalBundle}
                isClinicalLoading={isClinicalLoading}
                clinicalError={clinicalError}
                reloadClinicalBundle={reloadClinicalBundle}
                report={report}
                onGenerateReport={onGenerateReport}
                onOpenArgos={report.openArgosDiscussion}
              />
            </TabsContent>

            <TabsContent value="report" className="space-y-6">
              <ReportTab
                reportOutput={report.reportOutput}
                reportStreamRaw={report.reportStreamRaw}
                isReportStreaming={report.isReportStreaming}
                onGoToPatientInfo={() => setSelectedTab("patient-info")}
                onOpenArgos={report.openArgosDiscussion}
              />
            </TabsContent>

            <TabsContent value="discussions" className="space-y-4">
              <ArgosTabLink onOpenDiscussion={report.openArgosDiscussion} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
