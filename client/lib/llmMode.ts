import type { LlmStatus } from "@/lib/llmStatus";

export type LlmUiMode = "simulation" | "live" | "unavailable";

export interface LlmModePresentation {
  mode: LlmUiMode;
  title: string;
  detail: string;
}

/** Libellé clinique explicite : simulation vs IA réelle vs indisponible. */
export function describeLlmMode(status: LlmStatus): LlmModePresentation {
  if (status.provider === "mock_json") {
    return {
      mode: "simulation",
      title: "Mode simulation",
      detail:
        "Les réponses IA sont générées localement (mock_json), sans modèle clinique réel.",
    };
  }

  if (status.provider === "disabled" || !status.ready) {
    return {
      mode: "unavailable",
      title: "IA non connectée",
      detail: status.message,
    };
  }

  const modelLabel = status.model?.trim() || "modèle configuré";
  return {
    mode: "live",
    title: "IA connectée",
    detail: `Réponses produites par le service LLM (${modelLabel}).`,
  };
}
