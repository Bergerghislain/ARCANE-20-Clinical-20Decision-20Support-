import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiReflectionPanel } from "@/components/ai/AiReflectionPanel";
import { LlmModeBanner } from "@/components/ai/LlmModeBanner";
import type { SimulatedIaReport } from "@/lib/patientReport";

interface ReportTabProps {
  reportOutput: SimulatedIaReport | null;
  reportReflection: string;
  reportStreamRaw: string;
  isReportStreaming: boolean;
  onGoToPatientInfo: () => void;
  onOpenArgos: () => void;
}

export function ReportTab({
  reportOutput,
  reportReflection,
  reportStreamRaw,
  isReportStreaming,
  onGoToPatientInfo,
  onOpenArgos,
}: ReportTabProps) {
  const showReflection = isReportStreaming || reportReflection.length > 0;

  if (!reportOutput && !isReportStreaming) {
    return (
      <div className="space-y-4">
        <LlmModeBanner />
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-muted-foreground">Aucun rapport généré pour le moment.</p>
        <Button className="mt-4" onClick={onGoToPatientInfo}>
          Aller sur Informations patient
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <LlmModeBanner />
      {showReflection ? (
        <AiReflectionPanel
          reflection={reportReflection}
          isStreaming={isReportStreaming && !reportOutput}
          title="Réflexion clinique"
        />
      ) : null}

      {isReportStreaming && !reportOutput && !reportReflection && reportStreamRaw ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 font-mono text-xs text-muted-foreground">
          Génération du rapport en cours…
        </div>
      ) : null}

      {reportOutput ? (
        <>
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
              <div className="min-h-[120px] rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed">
                <ul className="list-disc space-y-2 pl-5">
                  {reportOutput.sources.map((source, index) => (
                    <li key={`${source}-${index}`}>{source}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onGoToPatientInfo}>
              Retour aux informations patient
            </Button>
            <Button onClick={onOpenArgos}>
              <Bot className="mr-2 h-4 w-4" />
              Ouvrir dans ARGOS
            </Button>
          </div>
        </>
      ) : isReportStreaming ? (
        <p className="text-sm text-muted-foreground">
          La synthèse structurée apparaîtra après la phase de réflexion…
        </p>
      ) : null}
    </div>
  );
}
