import { AlertCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SimulatedIaReport } from "@/lib/patientReport";

interface ReportTabProps {
  reportOutput: SimulatedIaReport | null;
  reportStreamRaw: string;
  isReportStreaming: boolean;
  onGoToPatientInfo: () => void;
  onOpenArgos: () => void;
}

export function ReportTab({
  reportOutput,
  reportStreamRaw,
  isReportStreaming,
  onGoToPatientInfo,
  onOpenArgos,
}: ReportTabProps) {
  if (!reportOutput) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">
          {isReportStreaming
            ? "Generation du rapport en cours..."
            : "Aucun rapport genere pour le moment."}
        </p>
        {reportStreamRaw ? (
          <div className="mx-auto mt-4 max-w-3xl whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-left font-mono text-xs text-foreground">
            {reportStreamRaw}
          </div>
        ) : null}
        <Button className="mt-4" onClick={onGoToPatientInfo}>
          Aller sur Patient Infos
        </Button>
      </div>
    );
  }

  return (
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
        <Button variant="secondary" onClick={onGoToPatientInfo}>
          Retour a Patient Infos
        </Button>
        <Button onClick={onOpenArgos}>
          <Bot className="mr-2 h-4 w-4" />
          Ouvrir dans ARGOS
        </Button>
      </div>
    </div>
  );
}
