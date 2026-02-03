import React from "react";
import { Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onSelectPatient: () => void;
  onStartGeneral: () => void;
}

export function WelcomeScreen({
  onSelectPatient,
  onStartGeneral,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-8">
      <div className="max-w-xl text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-cyan-600 shadow-lg">
            <Bot className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          ARGOS Clinical Assistant
        </h2>

        {/* Subtitle */}
        <p className="mb-6 text-lg text-muted-foreground">
          Your intelligent clinical decision support system
        </p>

        {/* Description */}
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          ARGOS leverages advanced AI to provide structured clinical reasoning,
          treatment hypotheses, and evidence-based recommendations. Select a
          patient to begin a consultation and receive comprehensive clinical
          support.
        </p>

        {/* Features List */}
        <div className="mb-8 space-y-3 text-left">
          <div className="flex gap-3 rounded-lg bg-primary/5 p-4">
            <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Structured Clinical Reasoning
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Synthesis, hypotheses, and evidence-based arguments
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg bg-secondary/5 p-4">
            <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-secondary to-cyan-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Conversation History
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Access all previous discussions with each patient
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg bg-success/5 p-4">
            <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Decision Support Framework
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Traceability to clinical guidelines and evidence
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="space-y-3">
          <Button
            variant="default"
            size="lg"
            onClick={onSelectPatient}
            className="w-full"
          >
            <span>Select a Patient to Begin</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onStartGeneral}
            className="w-full"
          >
            <span>Ask a General Question</span>
          </Button>
        </div>

        {/* Footer Text */}
        <p className="mt-6 text-xs text-muted-foreground">
          ARGOS recommendations are for decision support only. Always validate
          with clinical expertise and institutional protocols.
        </p>
      </div>
    </div>
  );
}
