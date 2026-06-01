import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClinicalSectionShellProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  sourceHint?: string;
  children: ReactNode;
}

export function ClinicalSectionShell({
  title,
  description,
  isLoading = false,
  error = null,
  sourceHint,
  children,
}: ClinicalSectionShellProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {sourceHint ? (
          <p className="text-xs text-muted-foreground">{sourceHint}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement depuis la base…
          </div>
        ) : null}
        {!isLoading && error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {!isLoading && !error ? children : null}
      </CardContent>
    </Card>
  );
}
