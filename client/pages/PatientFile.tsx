import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bot,
  FileText,
  MessageSquare,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";

interface ARGOSDiscussion {
  id: string;
  date: string;
  topic: string;
  summary: string;
}

const mockPatientData = {
  id: "1",
  name: "Marie Dubois",
  age: 52,
  condition: "Rare Lymphoma",
  mrn: "MRN-2024-001234",
  diagnosis: "Angioimmunoblastic T-Cell Lymphoma (AITL)",
  diagnosisDate: "2024-06-15",
  status: "active",
  lastVisit: "2025-01-14",
  clinicalData: {
    stage: "IVA",
    ecog: "1",
    ldh: "450 UI/L",
    albumin: "35 g/L",
  },
  discussions: [
    {
      id: "1",
      date: "2025-01-14",
      topic: "Treatment Options Discussion",
      summary:
        "Reviewed standard CHOP regimen vs experimental immunotherapy. ARGOS analyzed patient comorbidities.",
    },
    {
      id: "2",
      date: "2025-01-08",
      topic: "Staging and Risk Assessment",
      summary:
        "Comprehensive staging completed. ARGOS provided risk stratification and prognosis estimates.",
    },
    {
      id: "3",
      date: "2024-12-20",
      topic: "Initial Consultation",
      summary:
        "First ARGOS consultation. Discussed diagnostic criteria and initial treatment planning.",
    },
  ] as ARGOSDiscussion[],
};

export default function PatientFile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("overview");

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center gap-2 text-sm text-secondary hover:text-secondary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  {mockPatientData.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {mockPatientData.age} years
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {mockPatientData.mrn}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(mockPatientData.lastVisit).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </div>
                </div>
              </div>
              <Button
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                size="lg"
              >
                <Bot className="mr-2 h-5 w-5" />
                New ARGOS Discussion
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-auto">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Clinical Data</span>
              </TabsTrigger>
              <TabsTrigger
                value="discussions"
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">ARGOS Discussions</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Diagnosis Card */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground">Diagnosis</h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Confirmed Diagnosis
                  </p>
                  <p className="mt-1 text-lg font-medium text-primary">
                    {mockPatientData.diagnosis}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Diagnosed on{" "}
                    {new Date(mockPatientData.diagnosisDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>

                {/* Status Card */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground">Status</h3>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Case Status
                      </p>
                      <p className="mt-1 inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                        Active
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Assessment
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {new Date(mockPatientData.lastVisit).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Characteristics */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Key Characteristics
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      ECOG Performance Status
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {mockPatientData.clinicalData.ecog}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/5 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Stage
                    </p>
                    <p className="mt-1 text-2xl font-bold text-secondary">
                      {mockPatientData.clinicalData.stage}
                    </p>
                  </div>
                  <div className="rounded-lg bg-warning/5 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      LDH
                    </p>
                    <p className="mt-1 text-2xl font-bold text-warning">
                      {mockPatientData.clinicalData.ldh}
                    </p>
                  </div>
                  <div className="rounded-lg bg-success/5 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Albumin
                    </p>
                    <p className="mt-1 text-2xl font-bold text-success">
                      {mockPatientData.clinicalData.albumin}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Clinical Data Tab */}
            <TabsContent value="clinical" className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Structured Clinical Data
                </h3>
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Medical Record Number
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {mockPatientData.mrn}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Condition</p>
                      <p className="mt-1 font-medium text-foreground">
                        {mockPatientData.condition}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Diagnosis Date
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {new Date(
                          mockPatientData.diagnosisDate,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Status
                      </p>
                      <p className="mt-1 font-medium text-foreground capitalize">
                        {mockPatientData.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Discussions Tab */}
            <TabsContent value="discussions" className="space-y-4">
              {mockPatientData.discussions.length > 0 ? (
                mockPatientData.discussions.map((discussion) => (
                  <button
                    key={discussion.id}
                    className="w-full rounded-lg border border-border bg-card p-6 text-left transition-all hover:border-secondary hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">
                        {discussion.topic}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(discussion.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {discussion.summary}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-secondary">
                      <MessageSquare className="h-4 w-4" />
                      View discussion
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">
                    No ARGOS discussions yet
                  </p>
                  <Button className="mt-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Bot className="mr-2 h-4 w-4" />
                    Start New Discussion
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
