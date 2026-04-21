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
import { useArgosHistory, type UseArgosHistory, Message } from "@/hooks/useArgosHistory";
import { WelcomeScreen } from "@/components/argos/WelcomeScreen";
import { PatientSelector } from "@/components/argos/PatientSelector";
import { ArgosSidebar } from "@/components/argos/ArgosSidebar";
import {
  createArgosDiscussion,
  fetchArgosDiscussions,
  fetchArgosMessages,
  postArgosMessage,
} from "@/lib/argosApi";
import { apiFetch } from "@/lib/api";
import {
  buildArgosContextFromProfile,
  buildSimulatedAiReport,
  loadPatientReportProfile,
  PatientReportProfile,
} from "@/lib/patientReport";

interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  mrn?: string;
  status?: "active" | "pending" | "completed" | "unknown";
  contextProfile?: PatientReportProfile;
  contextMessage?: string;
}

const GENERAL_PATIENT: Patient = {
  id: "general",
  name: "General discussion",
  age: 0,
  condition: "General question",
};

// Mock patients from dashboard
const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Marie Dubois",
    age: 52,
    condition: "Rare Lymphoma",
    mrn: "MRN-2024-001234",
    status: "active",
  },
  {
    id: "2",
    name: "Jean Martin",
    age: 67,
    condition: "Sarcoma of the Jaw",
    mrn: "MRN-2024-001235",
    status: "pending",
  },
  {
    id: "3",
    name: "Sophie Bernard",
    age: 45,
    condition: "Neuroendocrine Tumor",
    mrn: "MRN-2024-001236",
    status: "active",
  },
  {
    id: "4",
    name: "Pierre Leclerc",
    age: 59,
    condition: "Angiosarcoma",
    mrn: "MRN-2024-001237",
    status: "completed",
  },
  {
    id: "5",
    name: "Isabelle Fournier",
    age: 38,
    condition: "Epithelioid Sarcoma",
    mrn: "MRN-2024-001238",
    status: "active",
  },
];

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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendDiscussionIds, setBackendDiscussionIds] = useState<
    Record<string, number>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const injectedContextKeysRef = useRef<Set<string>>(new Set());

  const currentConversation = argosHistory.getCurrentConversation();

  const patients = useMemo(() => {
    if (!selectedPatient) return [GENERAL_PATIENT, ...mockPatients];
    const exists = mockPatients.some((p) => p.id === selectedPatient.id);
    const base = exists ? mockPatients : [selectedPatient, ...mockPatients];
    return [GENERAL_PATIENT, ...base];
  }, [selectedPatient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const getBackendDiscussionId = (conversationId: string | null) => {
    if (!conversationId) return null;
    return backendDiscussionIds[conversationId] ?? null;
  };

  const setBackendDiscussionId = (conversationId: string, id: number) => {
    setBackendDiscussionIds((prev) => ({
      ...prev,
      [conversationId]: id,
    }));
  };

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
      contextProfile = await loadPatientReportProfile(targetPatient.id);
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
      void postArgosMessage(discussionId, {
        message_type: "clinician_note",
        content: contextMessage,
      }).catch(() => {
        // Le contexte reste disponible localement meme si la synchro backend echoue.
      });
    }

    injectedContextKeysRef.current.add(markerKey);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    argosHistory.setCurrentPatientId(patient.id);
    // If patient has existing conversations, load the most recent
    const patientConvs = argosHistory.getConversationsByPatient(patient.id);
    if (patientConvs.length > 0) {
      argosHistory.loadConversation(patientConvs[0].id);
      return;
    }
    // Pas encore de conversation locale : on tentera de charger une discussion ARGOS existante
    if (patient.id !== GENERAL_PATIENT.id) {
      void (async () => {
        try {
          const patientIdNum = Number(patient.id);
          if (!Number.isFinite(patientIdNum)) return;
          const discussions = await fetchArgosDiscussions(patientIdNum);
          if (discussions.length === 0) return;

          const discussion = discussions[0];
          const messages = await fetchArgosMessages(discussion.id);

          const convId = `conv_${discussion.id}`;
          const conversation = {
            id: convId,
            patientId: String(patient.id),
            patientName: patient.name,
            title: discussion.title || "ARGOS Discussion",
            createdAt: new Date(discussion.created_at),
            updatedAt: new Date(discussion.updated_at),
            messages: messages.map<Message>((m) => ({
              id: `msg_${m.id}`,
              role: m.message_type === "user_query" ? "user" : "assistant",
              content: m.content,
              timestamp: new Date(m.created_at),
              sections: m.sections
                ? {
                    clinicalSynthesis: m.sections.clinicalSynthesis ?? "",
                    hypotheses: m.sections.hypotheses ?? [],
                    arguments: m.sections.arguments ?? [],
                    nextSteps: m.sections.nextSteps ?? [],
                    traceability: m.sections.traceability ?? "",
                  }
                : undefined,
            })),
          };
          argosHistory.hydrateConversation(conversation);
          setBackendDiscussionId(convId, discussion.id);
        } catch {
          // en cas d'erreur, on reste en local uniquement
        }
      })();
    }
  };

  const handleNewConversation = (patient: Patient) => {
    setSelectedPatient(patient);
    const conv = argosHistory.createConversation(patient.id, patient.name);
    if (patient.id !== GENERAL_PATIENT.id) {
      void (async () => {
        try {
          const patientIdNum = Number(patient.id);
          if (!Number.isFinite(patientIdNum)) return;
          const discussion = await createArgosDiscussion({
            patientId: patientIdNum,
            title: conv.title,
          });
          setBackendDiscussionId(conv.id, discussion.id);
        } catch {
          // on garde au moins la conversation locale
        }
      })();
    }
  };

  const handleLoadConversation = (patient: Patient) => {
    handleSelectPatient(patient);
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
    const statePatient = (location.state as { patient?: Patient } | null)
      ?.patient;
    if (!statePatient) return;
    if (selectedPatient?.id === statePatient.id) return;

    setSelectedPatient(statePatient);
    argosHistory.setCurrentPatientId(statePatient.id);

    const patientConvs = argosHistory.getConversationsByPatient(
      statePatient.id,
    );
    if (patientConvs.length > 0) {
      argosHistory.loadConversation(patientConvs[0].id);
    } else {
      handleNewConversation(statePatient);
    }
  }, [
    location.state,
    selectedPatient?.id,
    argosHistory,
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
    backendDiscussionIds,
    argosHistory,
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let conversation = currentConversation;
    if (!conversation) {
      const fallbackPatient = selectedPatient ?? GENERAL_PATIENT;
      if (!selectedPatient) {
        setSelectedPatient(fallbackPatient);
      }
      conversation = argosHistory.createConversation(
        fallbackPatient.id,
        fallbackPatient.name,
      );
    }

    // Add user message
    const userMessage = argosHistory.addMessage(
      {
        role: "user",
        content: input,
        timestamp: new Date(),
      },
      conversation.id,
    );

    setInput("");
    setLoading(true);

    // Update title from first user message if needed
    argosHistory.updateTitleFromFirstMessage(conversation.id);

    const backendDiscussionId = getBackendDiscussionId(conversation.id);
    if (backendDiscussionId && userMessage) {
      void postArgosMessage(backendDiscussionId, {
        message_type: "user_query",
        content: userMessage.content,
      }).catch(() => {
        // si l'enregistrement serveur échoue, on garde au moins l'historique local
      });
    }

    const historyForModel = (conversation.messages || [])
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    void (async () => {
      try {
        const res = await apiFetch("/api/ai/argos/respond/stream", {
          method: "POST",
          body: JSON.stringify({
            patient_name: selectedPatient?.name,
            patient_mrn: selectedPatient?.mrn,
            context_message: selectedPatient?.contextMessage,
            profile: selectedPatient?.contextProfile,
            user_message: userMessage?.content || input,
            history: historyForModel,
          }),
        });
        if (!res.ok || !res.body) throw new Error("IA indisponible");

        // Message assistant "en cours" (on append au fil de l'eau)
        const assistantMessage = argosHistory.addMessage(
          {
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
          conversation.id,
        );

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let jsonText = "";
        let lastRendered = "";

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
              const chunk = JSON.parse(data) as any;
              const delta = chunk?.choices?.[0]?.delta?.content ?? "";
              if (typeof delta === "string" && delta) {
                jsonText += delta;
                // affichage brut pendant le stream
                if (assistantMessage) {
                  const merged = jsonText;
                  if (merged !== lastRendered) {
                    lastRendered = merged;
                    argosHistory.updateMessageContent(assistantMessage.id, merged);
                  }
                }
              }
            } catch {
              // ignore
            }
          }
        }

        // Parsing final JSON pour sections + contenu "propre"
        let finalContent = "";
        let finalSections: any = undefined;
        try {
          const parsed = JSON.parse(jsonText) as any;
          finalContent = String(parsed?.content ?? "");
          finalSections = parsed?.sections;
        } catch {
          finalContent = jsonText;
          finalSections = undefined;
        }

        if (assistantMessage) {
          argosHistory.updateMessageContent(assistantMessage.id, finalContent || jsonText);
          if (finalSections) {
            argosHistory.updateMessageSections(assistantMessage.id, finalSections);
          }
        }

        if (backendDiscussionId && assistantMessage) {
          void postArgosMessage(backendDiscussionId, {
            message_type: "argos_response",
            content: finalContent || jsonText,
            sections: finalSections,
          }).catch(() => {
            // ignore error côté serveur
          });
        }
      } catch {
        // Fallback local (simulation) si l'IA n'est pas configuree.
        const mockARGOSResponse = buildMockArgosResponse(selectedPatient);
        const assistantMessage = argosHistory.addMessage(
          {
            role: "assistant",
            content: "Here is my clinical assessment:",
            timestamp: new Date(),
            sections: mockARGOSResponse,
          },
          conversation.id,
        );
        if (backendDiscussionId && assistantMessage) {
          void postArgosMessage(backendDiscussionId, {
            message_type: "argos_response",
            content: assistantMessage.content,
            sections: {
              clinicalSynthesis: mockARGOSResponse.clinicalSynthesis,
              hypotheses: mockARGOSResponse.hypotheses,
              arguments: mockARGOSResponse.arguments,
              nextSteps: mockARGOSResponse.nextSteps,
              traceability: mockARGOSResponse.traceability,
            },
          }).catch(() => {});
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
          conversations={argosHistory.getConversations()}
          currentConversationId={argosHistory.currentConversationId}
          currentPatientId={argosHistory.currentPatientId}
          onLoadConversation={(conversationId) => {
            argosHistory.loadConversation(conversationId);
            setSidebarOpen(false);
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
              {selectedPatient ? selectedPatient.name : "Select a patient"}
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
                      ARGOS Clinical Assistant
                    </h1>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.id === GENERAL_PATIENT.id
                      ? "General discussion"
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
                onLoadConversation={handleLoadConversation}
              />

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
                        <p className="mb-3 text-sm">{message.content}</p>

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
                onLoadConversation={handleLoadConversation}
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
