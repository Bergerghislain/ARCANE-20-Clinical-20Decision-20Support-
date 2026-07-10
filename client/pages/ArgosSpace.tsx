import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Bot,
  User,
  Loader,
  Copy,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import { useArgosHistory, type UseArgosHistory, type Conversation } from "@/hooks/useArgosHistory";
import {
  useArgosPatients,
  type ArgosPatientOption,
} from "@/hooks/useArgosPatients";
import { WelcomeScreen } from "@/components/argos/WelcomeScreen";
import { PatientSelector } from "@/components/argos/PatientSelector";
import { ArgosSidebar } from "@/components/argos/ArgosSidebar";
import {
  fetchArgosDiscussions,
  fetchArgosMessages,
  updateArgosDiscussion,
} from "@/lib/argosApi";
import {
  backendDiscussionIdFromConversationId,
  mapDiscussionToConversation,
} from "@/lib/argosMappers";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { fr } from "@/lib/i18n/fr";
import { useCreateArgosDiscussionMutation } from "@/hooks/mutations/useCreateArgosDiscussionMutation";
import { usePostArgosMessageMutation } from "@/hooks/mutations/usePostArgosMessageMutation";
import { ClinicalAiDisclaimer } from "@/components/ClinicalAiDisclaimer";
import { AiReflectionPanel } from "@/components/ai/AiReflectionPanel";
import { streamArgosAiResponse } from "@/lib/argosAiStream";
import { filterVisibleArgosConversations } from "@/lib/argosConversationUtils";
import {
  persistArgosSession,
  pickConversationToRestore,
  readArgosSession,
} from "@/lib/argosSession";
import { fetchLlmStatus, formatLlmSetupHint } from "@/lib/llmStatus";
import {
  buildArgosContextFromProfile,
  buildSimulatedAiReport,
  loadPatientReportProfile,
  PatientReportProfile,
} from "@/lib/patientReport";

interface Patient extends ArgosPatientOption {
  contextProfile?: PatientReportProfile;
  contextMessage?: string;
}

const GENERAL_PATIENT: Patient = {
  id: "general",
  name: fr.argos.generalDiscussion,
  age: 0,
  condition: fr.argos.generalCondition,
};

const AUTO_CONTEXT_HEADER = "[Contexte Patient Auto Charge]";

function buildMockArgosResponse(patient: Patient | null) {
  const fallbackReport = buildSimulatedAiReport({
    patientName: patient?.name || "Patient",
    diagnosis: patient?.condition || "Diagnostic non precise",
    pathologySummary:
      "Contexte clinique simplifie. Aucun modele IA distant n'est encore branche.",
    analyses: [],
  });
  const sourceReport = patient?.contextProfile?.report || fallbackReport;

  return {
    clinicalSynthesis: sourceReport.conclusion,
    hypotheses: [
      "Confirmer la priorisation therapeutique en reunion multidisciplinaire",
      "Adapter la strategie selon tolerance clinique et nouvelles donnees biologiques",
      "Planifier une reevaluation structuree a court terme",
    ],
    arguments: [
      sourceReport.reasoning,
      "Les recommandations sont simulees localement a partir du profil patient JSON.",
      "Le raisonnement doit etre valide par un clinicien avant toute decision.",
    ],
    nextSteps: [
      "Completer les examens manquants (biologie/imagerie selon contexte)",
      "Partager la synthese avec l'equipe de prise en charge",
      "Mettre a jour le profil patient avant la prochaine discussion ARGOS",
    ],
    traceability: sourceReport.sources.join(" | "),
  };
}

export default function ArgosSpace() {
  const location = useLocation();
  const argosHistory: UseArgosHistory = useArgosHistory();
  const {
    patients: apiPatients,
    isLoading: patientsLoading,
    error: patientsError,
  } = useArgosPatients();
  const createDiscussionMutation = useCreateArgosDiscussionMutation();
  const postMessageMutation = usePostArgosMessageMutation();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarFocusPatientId, setSidebarFocusPatientId] = useState<string | null>(null);
  const [sidebarDefaultTab, setSidebarDefaultTab] = useState<"all" | "by-patient">("all");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [llmStatusMessage, setLlmStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const injectedContextKeysRef = useRef<Set<string>>(new Set());
  const navigatedPatientRef = useRef<string | null>(null);

  const currentConversation = argosHistory.getCurrentConversation();

  const visibleConversations = useMemo(
    () =>
      filterVisibleArgosConversations(
        argosHistory.getConversations(),
        argosHistory.currentConversationId,
      ),
    [argosHistory.conversations, argosHistory.currentConversationId],
  );

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    map.set(GENERAL_PATIENT.id, GENERAL_PATIENT.name);
    for (const patient of apiPatients) {
      map.set(patient.id, patient.name);
    }
    if (selectedPatient && selectedPatient.id !== GENERAL_PATIENT.id) {
      map.set(selectedPatient.id, selectedPatient.name);
    }
    return map;
  }, [apiPatients, selectedPatient]);

  const resolvePatientName = (patientId: string) =>
    patientNameById.get(patientId) ?? `Patient ${patientId}`;

  const patients = useMemo(() => {
    let list: Patient[] = [...apiPatients];
    if (
      selectedPatient &&
      selectedPatient.id !== GENERAL_PATIENT.id &&
      !list.some((p) => p.id === selectedPatient.id)
    ) {
      list = [selectedPatient, ...list];
    }
    return [GENERAL_PATIENT, ...list];
  }, [apiPatients, selectedPatient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const getBackendDiscussionId = (conversationId: string | null) =>
    conversationId ? backendDiscussionIdFromConversationId(conversationId) : null;

  const syncAllDiscussionsFromBackend = async (): Promise<Conversation[]> => {
    const discussions = await queryClient.fetchQuery({
      queryKey: queryKeys.argos.discussions(),
      queryFn: () => fetchArgosDiscussions(),
    });
    const loaded = await Promise.all(
      discussions.map(async (discussion) => {
        const messages = await queryClient.fetchQuery({
          queryKey: queryKeys.argos.messages(discussion.id),
          queryFn: () => fetchArgosMessages(discussion.id),
        });
        const patientName = resolvePatientName(String(discussion.patient_id));
        return mapDiscussionToConversation(discussion, messages, patientName);
      }),
    );
    argosHistory.mergeConversationsFromBackend(loaded);
    return loaded;
  };

  const restoreArgosSessionAfterSync = (conversations: Conversation[]) => {
    const statePatient = (location.state as { patient?: Patient } | null)?.patient;
    if (statePatient) return;

    const toRestore = pickConversationToRestore(
      conversations,
      readArgosSession(),
    );
    if (!toRestore) return;

    argosHistory.loadConversation(toRestore.id);
    const patientId = readArgosSession().patientId ?? toRestore.patientId;

    if (patientId === GENERAL_PATIENT.id) {
      setSelectedPatient(GENERAL_PATIENT);
      return;
    }

    const fromList = apiPatients.find((patient) => patient.id === patientId);
    setSelectedPatient(
      fromList ?? {
        id: toRestore.patientId,
        name: toRestore.patientName,
        age: 0,
        condition: fr.argos.unknownCondition,
      },
    );
    argosHistory.setCurrentPatientId(patientId);
  };

  const loadLatestPatientConversation = async (patient: Patient) => {
    const patientConvs = argosHistory.getConversationsByPatient(patient.id);
    if (patientConvs.length > 0) {
      argosHistory.loadConversation(patientConvs[0].id);
      return patientConvs[0];
    }
    if (patient.id === GENERAL_PATIENT.id) return null;

    const patientIdNum = Number(patient.id);
    if (!Number.isFinite(patientIdNum)) return null;

    const discussions = await fetchArgosDiscussions(patientIdNum);
    if (discussions.length === 0) return null;

    const discussion = discussions[0];
    const messages = await fetchArgosMessages(discussion.id);
    const conversation = mapDiscussionToConversation(
      discussion,
      messages,
      patient.name,
    );
    argosHistory.hydrateConversation(conversation);
    return conversation;
  };

  const createBackendConversation = async (
    patient: Patient,
    title = fr.argos.newConversation,
  ): Promise<Conversation> => {
    const patientIdNum = Number(patient.id);
    const result = await createDiscussionMutation.mutateAsync({
      patientId: patientIdNum,
      patientName: patient.name,
      title,
    });
    const conversation = mapDiscussionToConversation(
      result.discussion,
      result.messages,
      patient.name,
    );
    argosHistory.hydrateConversation(conversation);
    return conversation;
  };

  // Charge l'historique ARGOS depuis l'API (source de vérité) au montage.
  useEffect(() => {
    if (!argosHistory.isLoaded) return;

    let cancelled = false;
    void (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const loaded = await syncAllDiscussionsFromBackend();
        if (!cancelled) {
          restoreArgosSessionAfterSync(loaded);
        }
      } catch {
        if (!cancelled) {
          setHistoryError(
            "Impossible de charger l'historique ARGOS depuis le serveur.",
          );
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [argosHistory.isLoaded]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchLlmStatus();
        if (!cancelled) {
          setLlmStatusMessage(
            status.ready ? null : formatLlmSetupHint(status),
          );
        }
      } catch {
        if (!cancelled) {
          setLlmStatusMessage(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentConversation) return;
    persistArgosSession(
      currentConversation.id,
      selectedPatient?.id ?? currentConversation.patientId,
    );
  }, [currentConversation?.id, selectedPatient?.id, currentConversation?.patientId]);

  const ensurePatientContextInConversation = async (
    targetPatient: Patient,
    conversationId: string,
  ) => {
    if (targetPatient.id === GENERAL_PATIENT.id) return;

    const markerKey = `${conversationId}:${targetPatient.id}`;
    if (injectedContextKeysRef.current.has(markerKey)) return;

    const conversation = argosHistory
      .getConversations()
      .find((conv) => conv.id === conversationId);
    if (!conversation) return;

    const alreadyContainsContext = conversation.messages.some((message) =>
      message.content.includes(AUTO_CONTEXT_HEADER),
    );
    if (alreadyContainsContext) {
      injectedContextKeysRef.current.add(markerKey);
      return;
    }

    let contextProfile = targetPatient.contextProfile;
    if (!contextProfile) {
      contextProfile =
        (await loadPatientReportProfile(targetPatient.id)) ?? undefined;
    }
    if (!contextProfile) {
      const fallback = buildSimulatedAiReport({
        patientName: targetPatient.name,
        diagnosis: targetPatient.condition || "Diagnostic non precise",
        pathologySummary:
          "Contexte manuel minimal charge automatiquement dans ARGOS.",
        analyses: [],
      });
      contextProfile = {
        schemaVersion: 1,
        patientId: targetPatient.id,
        diagnosis: targetPatient.condition || "Diagnostic non precise",
        pathologySummary:
          "Profil patient partiel. Completer les informations dans l'onglet Patient Infos.",
        analyses: [],
        report: fallback,
      };
    }

    const contextMessage =
      targetPatient.contextMessage ||
      buildArgosContextFromProfile(
        contextProfile,
        targetPatient.name,
        targetPatient.mrn,
      );

    argosHistory.addMessage(
      {
        role: "assistant",
        content: `${AUTO_CONTEXT_HEADER}\n${contextMessage}`,
        timestamp: new Date(),
      },
      conversationId,
    );

    const discussionId = getBackendDiscussionId(conversationId);
    if (discussionId) {
      void postMessageMutation
        .mutateAsync({
          discussionId,
          patientId: Number(targetPatient.id),
          message_type: "clinician_note",
          content: contextMessage,
        })
        .catch(() => {
          // Le contexte reste visible dans l'UI même si la synchro backend échoue.
        });
    }

    injectedContextKeysRef.current.add(markerKey);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    argosHistory.setCurrentPatientId(patient.id);
    void loadLatestPatientConversation(patient);
  };

  const handleNewConversation = (patient: Patient) => {
    setSelectedPatient(patient);
    if (patient.id === GENERAL_PATIENT.id) {
      argosHistory.createConversation(patient.id, patient.name);
      return;
    }
    void (async () => {
      try {
        await createBackendConversation(patient);
      } catch {
        setHistoryError("Impossible de créer la discussion ARGOS sur le serveur.");
      }
    })();
  };

  const handleOpenPatientHistory = (patient: Patient) => {
    setSelectedPatient(patient);
    argosHistory.setCurrentPatientId(patient.id);
    setSidebarFocusPatientId(patient.id);
    setSidebarDefaultTab("by-patient");
    setSidebarOpen(true);
    void loadLatestPatientConversation(patient);
  };

  const handlePatientSelectorOpen = () => {
    setSelectedPatient(null);
    argosHistory.setCurrentConversationId(null);
  };

  const handleStartGeneral = () => {
    setSelectedPatient(GENERAL_PATIENT);
    argosHistory.createConversation(
      GENERAL_PATIENT.id,
      GENERAL_PATIENT.name,
    );
  };

  useEffect(() => {
    if (!argosHistory.isLoaded || historyLoading) return;

    const statePatient = (location.state as { patient?: Patient } | null)?.patient;
    if (!statePatient) return;
    if (navigatedPatientRef.current === statePatient.id) return;
    if (selectedPatient?.id === statePatient.id && currentConversation) return;

    navigatedPatientRef.current = statePatient.id;
    setSelectedPatient(statePatient);
    argosHistory.setCurrentPatientId(statePatient.id);

    void loadLatestPatientConversation(statePatient);
  }, [
    location.state,
    selectedPatient?.id,
    currentConversation?.id,
    argosHistory.isLoaded,
    historyLoading,
  ]);

  // Injecte automatiquement le contexte patient dans la conversation active.
  useEffect(() => {
    if (!selectedPatient || !currentConversation) return;
    void ensurePatientContextInConversation(
      selectedPatient,
      currentConversation.id,
    );
  }, [
    selectedPatient,
    currentConversation?.id,
    argosHistory,
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const fallbackPatient = selectedPatient ?? GENERAL_PATIENT;
    if (!selectedPatient) {
      setSelectedPatient(fallbackPatient);
    }

    void (async () => {
      let conversation = currentConversation;
      if (!conversation) {
        if (fallbackPatient.id === GENERAL_PATIENT.id) {
          conversation = argosHistory.createConversation(
            fallbackPatient.id,
            fallbackPatient.name,
          );
        } else {
          try {
            conversation = await createBackendConversation(fallbackPatient);
          } catch {
            setAiError("Impossible de créer la discussion ARGOS sur le serveur.");
            return;
          }
        }
      }

      const userContent = input.trim();
      setInput("");
      setLoading(true);
      setAiError(null);

      const userMessage = argosHistory.addMessage(
        {
          role: "user",
          content: userContent,
          timestamp: new Date(),
        },
        conversation.id,
      );

      const newTitle = argosHistory.updateTitleFromFirstMessage(
        conversation.id,
        userContent,
      );

      const backendDiscussionId = getBackendDiscussionId(conversation.id);
      if (backendDiscussionId && newTitle) {
        void updateArgosDiscussion(backendDiscussionId, { title: newTitle }).catch(
          () => {
            setAiError(
              "Titre mis à jour localement mais non synchronisé avec le serveur.",
            );
          },
        );
      }
      if (backendDiscussionId && userMessage) {
        void postMessageMutation
          .mutateAsync({
            discussionId: backendDiscussionId,
            patientId: selectedPatient ? Number(selectedPatient.id) : undefined,
            message_type: "user_query",
            content: userMessage.content,
          })
          .catch(() => {
            setAiError(
              "Message enregistré localement mais non synchronisé avec le serveur.",
            );
          });
      }

      const historyForModel = (
        userMessage
          ? [...(conversation.messages || []), userMessage]
          : conversation.messages || []
      )
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      try {
        const assistantMessage = argosHistory.addMessage(
          {
            role: "assistant",
            content: "",
            reflection: "",
            isGenerating: true,
            timestamp: new Date(),
          },
          conversation.id,
        );

        const { content: finalContent, reflection: finalReflection, sections: finalSections } =
          await streamArgosAiResponse(
            {
              patient_name: selectedPatient?.name,
              patient_mrn: selectedPatient?.mrn,
              context_message: selectedPatient?.contextMessage,
              profile: selectedPatient?.contextProfile,
              user_message: userMessage?.content || userContent,
              history: historyForModel,
            },
            (progress) => {
              if (!assistantMessage) return;
              argosHistory.updateMessageReflection(
                assistantMessage.id,
                progress.reflection,
                !progress.hasStructuredOutput,
              );
              if (progress.hasStructuredOutput && progress.content) {
                argosHistory.updateMessageContent(assistantMessage.id, progress.content);
              }
            },
          );

        if (assistantMessage) {
          argosHistory.updateMessageReflection(
            assistantMessage.id,
            finalReflection,
            false,
          );
          argosHistory.updateMessageContent(assistantMessage.id, finalContent);
          if (finalSections) {
            argosHistory.updateMessageSections(assistantMessage.id, finalSections);
          }
        }

        if (backendDiscussionId && assistantMessage) {
          try {
            await postMessageMutation.mutateAsync({
              discussionId: backendDiscussionId,
              patientId: selectedPatient ? Number(selectedPatient.id) : undefined,
              message_type: "argos_response",
              content: finalContent,
              sections: finalSections,
            });
          } catch {
            setAiError(
              "Réponse ARGOS affichée mais non enregistrée sur le serveur.",
            );
          }
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de la génération ARGOS.";
        setAiError(message);
        if (import.meta.env.VITE_ARGOS_MOCK_FALLBACK === "true") {
          const mockARGOSResponse = buildMockArgosResponse(selectedPatient);
          argosHistory.addMessage(
            {
              role: "assistant",
              content: "Réponse simulée (fallback activé) :",
              timestamp: new Date(),
              sections: mockARGOSResponse,
            },
            conversation.id,
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col sm:flex-row bg-background overflow-hidden">
        {/* Sidebar */}
        <ArgosSidebar
          conversations={visibleConversations}
          currentConversationId={argosHistory.currentConversationId}
          currentPatientId={argosHistory.currentPatientId}
          focusPatientId={sidebarFocusPatientId}
          defaultTab={sidebarDefaultTab}
          onLoadConversation={(conversationId) => {
            argosHistory.loadConversation(conversationId);
            setSidebarOpen(false);
            setSidebarFocusPatientId(null);
          }}
          onDeleteConversation={argosHistory.deleteConversation}
          onRenameConversation={argosHistory.renameConversation}
          onNewConversation={() => handlePatientSelectorOpen()}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Sidebar Toggle */}
          <div className="sm:hidden flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-medium text-muted-foreground flex-1">
              {selectedPatient ? selectedPatient.name : fr.argos.selectPatient}
            </span>
          </div>

          {selectedPatient && currentConversation ? (
            // Chat Interface
            <>
              {/* Header */}
              <div className="border-b border-border/50 bg-gradient-to-r from-white to-blue-50 px-6 py-4 shadow-sm hidden sm:block">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-secondary to-cyan-600">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      {fr.argos.title}
                    </h1>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.id === GENERAL_PATIENT.id
                      ? fr.argos.generalDiscussion
                      : `Patient: ${selectedPatient.name} ${
                          selectedPatient.mrn ? `(${selectedPatient.mrn})` : ""
                        } • ${selectedPatient.condition}`}
                  </p>
                </div>
              </div>

              {/* Patient Selector Bar */}
              <PatientSelector
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={handleSelectPatient}
                onNewConversation={handleNewConversation}
                onLoadConversation={handleOpenPatientHistory}
              />

              <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 space-y-2">
                <ClinicalAiDisclaimer compact />
                {patientsLoading && (
                  <p className="text-xs text-muted-foreground">
                    Chargement des patients depuis l&apos;API…
                  </p>
                )}
                {patientsError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{patientsError}</span>
                  </div>
                )}
                {llmStatusMessage && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{llmStatusMessage}</span>
                  </div>
                )}
                {historyError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{historyError}</span>
                  </div>
                )}
                {aiError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-4 px-4 sm:px-6 py-6">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      )}

                      <div
                        className={`max-w-2xl rounded-lg px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-foreground"
                        }`}
                      >
                        {(message.role === "assistant" &&
                          (message.reflection || message.isGenerating)) && (
                          <AiReflectionPanel
                            reflection={message.reflection ?? ""}
                            isStreaming={message.isGenerating}
                            className="mb-3"
                          />
                        )}

                        {message.content ? (
                          <p className="mb-3 text-sm">{message.content}</p>
                        ) : message.isGenerating ? (
                          <p className="mb-3 text-sm text-muted-foreground">
                            Synthèse clinique en cours…
                          </p>
                        ) : null}

                        {message.sections && (
                          <div className="space-y-4 mt-4 pt-4 border-t border-border">
                            {/* Clinical Synthesis */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2 text-secondary">
                                1. Clinical Synthesis
                              </h4>
                              <p className="text-sm leading-relaxed">
                                {message.sections.clinicalSynthesis}
                              </p>
                            </div>

                            {/* Hypotheses */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2 text-secondary">
                                2. Hypotheses / Options
                              </h4>
                              <ul className="space-y-2 text-sm">
                                {message.sections.hypotheses.map((h, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="font-medium flex-shrink-0">
                                      {String.fromCharCode(97 + i)}.
                                    </span>
                                    <span>{h}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Arguments */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2 text-secondary">
                                3. Arguments
                              </h4>
                              <ul className="space-y-1 text-sm">
                                {message.sections.arguments.map((arg, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-secondary">→</span>
                                    <span>{arg}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Next Steps */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2 text-secondary">
                                4. Next Steps
                              </h4>
                              <ol className="space-y-1 text-sm list-decimal list-inside">
                                {message.sections.nextSteps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            </div>

                            {/* Traceability */}
                            <div className="rounded bg-secondary/5 p-3 text-xs text-muted-foreground border border-secondary/20">
                              <div className="font-semibold text-secondary/80 mb-1">
                                5. Traceability
                              </div>
                              <p>{message.sections.traceability}</p>
                            </div>
                          </div>
                        )}

                        {message.role === "assistant" && (
                          <div className="mt-3 flex gap-2">
                            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1">
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1">
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Bot className="h-5 w-5 text-white animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-3">
                        <Loader className="h-4 w-4 animate-spin text-secondary" />
                        <span className="text-sm text-muted-foreground">
                          ARGOS is analyzing...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-border bg-card px-4 sm:px-6 py-4">
                <div className="max-w-4xl mx-auto">
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        type="text"
                        placeholder="Ask ARGOS about treatment options, staging, or next steps..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={loading || !input.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <p>
                        ARGOS recommendations are for decision support. Always
                        validate with clinical expertise.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </>
          ) : (
            // Welcome/Patient Selection Screen
            <>
              <PatientSelector
                patients={patients}
                selectedPatient={null}
                onSelectPatient={handleSelectPatient}
                onNewConversation={handleNewConversation}
                onLoadConversation={handleOpenPatientHistory}
              />
              <WelcomeScreen
                onSelectPatient={handlePatientSelectorOpen}
                onStartGeneral={handleStartGeneral}
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
