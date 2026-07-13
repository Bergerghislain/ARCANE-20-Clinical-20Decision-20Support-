import { AlertCircle, Bot, FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { describeLlmMode } from "@/lib/llmMode";
import { fetchLlmStatus, formatLlmSetupHint } from "@/lib/llmStatus";
import { fr } from "@/lib/i18n/fr";
import { queryKeys } from "@/lib/queryKeys";

const modeStyles = {
  simulation: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-950 dark:text-amber-100",
    Icon: FlaskConical,
  },
  live: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-950 dark:text-emerald-100",
    Icon: Bot,
  },
  unavailable: {
    border: "border-destructive/30",
    bg: "bg-destructive/10",
    text: "text-destructive",
    Icon: AlertCircle,
  },
} as const;

export function LlmModeBanner() {
  const { data: status } = useQuery({
    queryKey: queryKeys.ai.status(),
    queryFn: fetchLlmStatus,
    staleTime: 60_000,
  });

  if (!status) return null;

  const presentation = describeLlmMode(status);
  const style = modeStyles[presentation.mode];
  const Icon = style.Icon;
  const setupHint =
    presentation.mode === "unavailable" ? formatLlmSetupHint(status) : null;

  return (
    <div
      role="status"
      data-testid="llm-mode-banner"
      data-llm-mode={presentation.mode}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${style.border} ${style.bg} ${style.text}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-medium">{presentation.title}</p>
        <p className="text-xs opacity-90">{presentation.detail}</p>
        {setupHint && setupHint !== presentation.detail ? (
          <p className="text-xs opacity-90">{setupHint}</p>
        ) : null}
        {presentation.mode === "simulation" ? (
          <p className="text-xs opacity-80">{fr.llm.simulationDisclaimer}</p>
        ) : null}
      </div>
    </div>
  );
}
