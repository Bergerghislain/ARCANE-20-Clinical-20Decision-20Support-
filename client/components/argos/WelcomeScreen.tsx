import React from "react";
import { Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

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
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-cyan-600 shadow-lg">
            <Bot className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="mb-3 text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          {fr.argos.title}
        </h2>

        <p className="mb-6 text-lg text-muted-foreground">{fr.argos.subtitle}</p>

        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          ARGOS s&apos;appuie sur l&apos;IA pour fournir un raisonnement clinique
          structuré, des hypothèses thérapeutiques et des recommandations fondées
          sur les données. Sélectionnez un patient pour démarrer une consultation.
        </p>

        <div className="mb-8 space-y-3 text-left">
          <div className="flex gap-3 rounded-lg bg-primary/5 p-4">
            <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Raisonnement clinique structuré
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Synthèse, hypothèses et arguments fondés sur les preuves
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg bg-secondary/5 p-4">
            <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-secondary to-cyan-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Historique des conversations
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Retrouvez toutes les discussions passées par patient
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg bg-success/5 p-4">
            <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Cadre d&apos;aide à la décision
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Traçabilité vers les recommandations et la littérature
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="default"
            size="lg"
            onClick={onSelectPatient}
            className="w-full"
          >
            <span>Sélectionner un patient</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onStartGeneral}
            className="w-full"
          >
            <span>Poser une question générale</span>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Les recommandations ARGOS sont une aide à la décision uniquement. Toujours
          valider avec l&apos;expertise clinique et les protocoles de votre établissement.
        </p>
      </div>
    </div>
  );
}
