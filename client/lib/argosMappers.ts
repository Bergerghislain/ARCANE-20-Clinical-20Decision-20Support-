import type { Conversation, Message } from "@/hooks/useArgosHistory";
import type { ArgosDiscussion, ArgosMessage } from "@/lib/argosApi";

export const ARGOS_WELCOME_MESSAGE =
  "Hello, I am ARGOS, your clinical decision support assistant. I am ready to help you with clinical reasoning for this patient case. Please share your clinical question or context.";

export function conversationIdFromBackendDiscussionId(discussionId: number): string {
  return `conv_${discussionId}`;
}

export function backendDiscussionIdFromConversationId(
  conversationId: string,
): number | null {
  const match = /^conv_(\d+)$/.exec(conversationId);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export function mapArgosMessageToMessage(m: ArgosMessage): Message {
  const role: Message["role"] =
    m.message_type === "user_query" ? "user" : "assistant";

  return {
    id: `msg_${m.id}`,
    role,
    content: m.content,
    timestamp: new Date(m.created_at),
    sections: m.sections
      ? {
          clinicalSynthesis: m.sections.clinicalSynthesis ?? "",
          hypotheses: m.sections.hypotheses ?? [],
          arguments: m.sections.arguments ?? [],
          nextSteps: m.sections.nextSteps ?? [],
          traceability: m.sections.traceability ?? "",
        }
      : undefined,
  };
}

export function mapDiscussionToConversation(
  discussion: ArgosDiscussion,
  messages: ArgosMessage[],
  patientName: string,
): Conversation {
  return {
    id: conversationIdFromBackendDiscussionId(discussion.id),
    patientId: String(discussion.patient_id),
    patientName,
    title: discussion.title || "ARGOS Discussion",
    createdAt: new Date(discussion.created_at),
    updatedAt: new Date(discussion.updated_at),
    messages:
      messages.length > 0
        ? messages.map(mapArgosMessageToMessage)
        : [
            {
              id: `msg_welcome_${discussion.id}`,
              role: "assistant" as const,
              content: ARGOS_WELCOME_MESSAGE,
              timestamp: new Date(discussion.created_at),
            },
          ],
  };
}
