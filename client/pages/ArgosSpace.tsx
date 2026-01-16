import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sections?: {
    clinicalSynthesis: string;
    hypotheses: string[];
    arguments: string[];
    nextSteps: string[];
    traceability: string;
  };
}

const mockARGOSResponse = {
  clinicalSynthesis:
    "Patient presents with advanced AITL (stage IVA) with elevated LDH and borderline albumin levels, indicating intermediate-to-high risk disease. ECOG status of 1 suggests patient can tolerate systemic therapy with appropriate supportive care.",
  hypotheses: [
    "Standard CHOP-based chemotherapy followed by allogeneic hematopoietic stem cell transplantation",
    "Experimental anti-TIM3 immunotherapy in combination with low-dose chemotherapy",
    "Consolidated approach with induction CHOP followed by brentuximab vedotin",
  ],
  arguments: [
    "CHOP remains gold standard for AITL with 5-year OS ~40% in this risk category",
    "Early HSCT in CR1 has shown benefit in selected patients",
    "Anti-TIM3 therapy emerging evidence in AITL with potential for reduced toxicity",
    "ECOG 1 permits standard-dose chemotherapy; no renal/cardiac contraindications",
  ],
  nextSteps: [
    "Review recent imaging and confirm organ function (renal, cardiac)",
    "Discuss with patient and family regarding transplant eligibility",
    "Consider genetic testing for prognosis refinement (TET2, DNMT3A mutations)",
    "Schedule multidisciplinary tumor board review",
  ],
  traceability:
    "Analysis based on NCCN 2024 guidelines, GITL consensus recommendations, and institutional protocols. Generated from clinical data of patient Marie Dubois (MRN-2024-001234) on 2025-01-15.",
};

export default function ArgosSpace() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello, I am ARGOS, your clinical decision support assistant. I am ready to help you with clinical reasoning for this patient case. Please share your clinical question or context.",
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate ARGOS response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Here is my clinical assessment:",
        timestamp: new Date(),
        sections: mockARGOSResponse,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    }, 1500);
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="h-6 w-6 text-secondary" />
              <h1 className="text-2xl font-bold text-primary">
                ARGOS Clinical Assistant
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Patient: Marie Dubois (MRN-2024-001234) • Angioimmunoblastic
              T-Cell Lymphoma (AITL)
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4 px-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
        <div className="border-t border-border bg-card px-6 py-4">
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
                  disabled={loading || !input.trim()}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
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
      </div>
    </MainLayout>
  );
}
