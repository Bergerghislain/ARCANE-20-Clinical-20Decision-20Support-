import { apiFetch } from "@/lib/api";
import type { PatientReportProfile } from "@/lib/patientReport";

export type ArgosStreamHistoryItem = {
  role: string;
  content: string;
};

export type ArgosStreamRequest = {
  patient_name?: string;
  patient_mrn?: string;
  context_message?: string;
  profile?: PatientReportProfile;
  user_message: string;
  history: ArgosStreamHistoryItem[];
};

export type ArgosStreamSections = {
  clinicalSynthesis: string;
  hypotheses: string[];
  arguments: string[];
  nextSteps: string[];
  traceability: string;
};

export type ArgosStreamResult = {
  content: string;
  sections?: ArgosStreamSections;
  rawJson: string;
};

function isLlmStreamErrorPayload(data: string): boolean {
  const lowered = data.toLowerCase();
  return (
    lowered.includes("llm endpoint is unreachable") ||
    lowered.includes("llm request failed") ||
    lowered.includes("llm temporarily unavailable") ||
    lowered.includes("llm provider is disabled")
  );
}

export async function streamArgosAiResponse(
  payload: ArgosStreamRequest,
  onDelta: (partialJson: string) => void,
): Promise<ArgosStreamResult> {
  const res = await apiFetch("/api/ai/argos/respond/stream", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    throw new Error(
      res.status === 503
        ? "Service IA temporairement indisponible."
        : "IA indisponible (vérifiez LLM_PROVIDER et le serveur LLM).",
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let jsonText = "";
  let lastRendered = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf("\n");
      if (idx === -1) break;
      const line = buffer.slice(0, idx).trimEnd();
      buffer = buffer.slice(idx + 1);

      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === "[DONE]") {
        buffer = "";
        break;
      }

      if (isLlmStreamErrorPayload(data)) {
        throw new Error(data);
      }

      try {
        const chunk = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = chunk?.choices?.[0]?.delta?.content ?? "";
        if (typeof delta === "string" && delta) {
          jsonText += delta;
          if (jsonText !== lastRendered) {
            lastRendered = jsonText;
            onDelta(jsonText);
          }
        }
      } catch {
        // ignore malformed SSE chunk
      }
    }
  }

  let content = "";
  let sections: ArgosStreamSections | undefined;
  try {
    const parsed = JSON.parse(jsonText) as {
      content?: string;
      sections?: ArgosStreamSections;
    };
    content = String(parsed?.content ?? "");
    sections = parsed?.sections;
  } catch {
    content = jsonText;
    sections = undefined;
  }

  if (!content && !jsonText.trim()) {
    throw new Error("Réponse IA vide.");
  }

  return {
    content: content || jsonText,
    sections,
    rawJson: jsonText,
  };
}
