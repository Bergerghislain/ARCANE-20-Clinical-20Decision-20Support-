import { apiFetch } from "@/lib/api";

export interface LlmStatus {
  provider: string;
  ready: boolean;
  message: string;
  model?: string;
  base_url?: string;
}

export async function fetchLlmStatus(): Promise<LlmStatus> {
  const res = await apiFetch("/api/ai/status");
  if (!res.ok) {
    return {
      provider: "unknown",
      ready: false,
      message: "Impossible de vérifier l'état du service IA.",
    };
  }
  return res.json();
}

export function formatLlmSetupHint(status: LlmStatus): string {
  if (status.ready) return status.message;
  if (status.provider === "disabled") {
    return `${status.message} Exemple Groq : LLM_PROVIDER=openai_compatible, LLM_BASE_URL=https://api.groq.com/openai/v1, LLM_API_KEY=gsk_...`;
  }
  if (status.message.includes("LLM_API_KEY")) {
    return `${status.message} Obtenez une clé sur https://console.groq.com puis redémarrez l'API.`;
  }
  return status.message;
}
