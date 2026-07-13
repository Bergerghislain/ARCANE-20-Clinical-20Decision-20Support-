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
  if (status.provider === "mock_json") {
    return status.message;
  }
  if (status.provider === "disabled") {
    return (
      `${status.message} Sans clé API : mettez LLM_PROVIDER=mock_json dans .env. ` +
      `Pour une vraie IA locale : installez Ollama (ollama.com) puis LLM_BASE_URL=http://127.0.0.1:11434/v1.`
    );
  }
  if (status.message.includes("LLM_API_KEY")) {
    return (
      `${status.message} Alternatives sans Groq : LLM_PROVIDER=mock_json (simulation) ` +
      `ou Ollama local (gratuit, ollama pull llama3.2).`
    );
  }
  if (status.message.includes("injoignable") || status.message.includes("local")) {
    return (
      `${status.message} Essayez mock_json dans .env, ou installez Ollama : ` +
      `ollama pull llama3.2 puis LLM_BASE_URL=http://127.0.0.1:11434/v1.`
    );
  }
  return status.message;
}
