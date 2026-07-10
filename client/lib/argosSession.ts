import type { Conversation } from "@/hooks/useArgosHistory";
import { sortConversationsByDate } from "@/lib/argosConversationUtils";

const CONVERSATION_KEY = "argos_active_conversation_id";
const PATIENT_KEY = "argos_active_patient_id";

export function persistArgosSession(
  conversationId: string,
  patientId: string,
): void {
  sessionStorage.setItem(CONVERSATION_KEY, conversationId);
  sessionStorage.setItem(PATIENT_KEY, patientId);
}

export function readArgosSession(): {
  conversationId: string | null;
  patientId: string | null;
} {
  return {
    conversationId: sessionStorage.getItem(CONVERSATION_KEY),
    patientId: sessionStorage.getItem(PATIENT_KEY),
  };
}

export function clearArgosSession(): void {
  sessionStorage.removeItem(CONVERSATION_KEY);
  sessionStorage.removeItem(PATIENT_KEY);
}

/** Choisit la conversation à rouvrir après F5 (session puis plus récente avec message user). */
export function pickConversationToRestore(
  conversations: Conversation[],
  session: { conversationId: string | null; patientId: string | null },
): Conversation | null {
  if (session.conversationId) {
    const fromSession = conversations.find(
      (conversation) => conversation.id === session.conversationId,
    );
    if (fromSession) return fromSession;
  }

  return (
    sortConversationsByDate(conversations).find((conversation) =>
      conversation.messages.some((message) => message.role === "user"),
    ) ?? null
  );
}
