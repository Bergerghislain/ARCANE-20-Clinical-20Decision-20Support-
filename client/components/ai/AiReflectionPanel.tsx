import { Brain, Loader2 } from "lucide-react";

interface AiReflectionPanelProps {
  reflection: string;
  isStreaming?: boolean;
  title?: string;
  className?: string;
}

export function AiReflectionPanel({
  reflection,
  isStreaming = false,
  title = "Réflexion clinique",
  className = "",
}: AiReflectionPanelProps) {
  if (!reflection && !isStreaming) return null;

  return (
    <div
      className={`rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-4 shadow-sm ${className}`}
      aria-live="polite"
      aria-busy={isStreaming}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-950">
        {isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
        ) : (
          <Brain className="h-4 w-4 text-amber-700" />
        )}
        <span>{isStreaming ? `${title}…` : title}</span>
      </div>
      <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-amber-100/80 bg-white/70 p-3 font-mono text-xs leading-relaxed text-amber-950/90">
        {reflection || (isStreaming ? "Analyse du contexte en cours…" : "")}
        {isStreaming ? (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-amber-600 align-middle" />
        ) : null}
      </div>
    </div>
  );
}
