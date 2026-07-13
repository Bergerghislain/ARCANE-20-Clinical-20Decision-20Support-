import type { Conversation } from "@/hooks/useArgosHistory";

/** Discussions locales (discussion générale) — distinctes des IDs backend `conv_<id>`. */
export const AUTO_CONTEXT_HEADER = "[Contexte Patient Auto Charge]";

export function isLocalOnlyConversationId(id: string): boolean {
  return id.startsWith("local_");
}

export function sortConversationsByDate(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

/** Fusionne l'API et les fils locaux sans doublon (clé = conversation.id). */
export function mergeBackendAndLocalConversations(
  existing: Conversation[],
  fromBackend: Conversation[],
): Conversation[] {
  const localOnly = existing.filter((c) => isLocalOnlyConversationId(c.id));
  const merged = new Map<string, Conversation>();
  for (const conversation of fromBackend) {
    merged.set(conversation.id, conversation);
  }
  for (const conversation of localOnly) {
    merged.set(conversation.id, conversation);
  }
  return sortConversationsByDate(Array.from(merged.values()));
}

/**
 * Masque les discussions serveur vides (seulement message d'accueil)
 * sauf la conversation actuellement ouverte.
 */
export function filterVisibleArgosConversations(
  conversations: Conversation[],
  currentConversationId: string | null,
): Conversation[] {
  return conversations.filter((conversation) => {
    if (conversation.id === currentConversationId) return true;
    if (isLocalOnlyConversationId(conversation.id)) return true;
    return conversation.messages.some((message) => message.role === "user");
  });
}

export function isAutoContextMessage(content: string): boolean {
  return (
    content.includes(AUTO_CONTEXT_HEADER) ||
    content.includes("Contexte patient auto-charge:")
  );
}

export function isArgosWelcomeMessage(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith("Hello, I am ARGOS") ||
    trimmed.startsWith("Bonjour, je suis ARGOS") ||
    trimmed.includes("clinical decision support assistant")
  );
}

export function isPromptEchoContent(content: string): boolean {
  return (
    content.includes('"output_format"') &&
    (content.includes('"user_message"') || content.includes('"constraints"'))
  );
}

type ChatMessage = {
  role: string;
  content: string;
};

export function filterVisibleChatMessages<T extends ChatMessage>(messages: T[]): T[] {
  return messages.filter((message) => {
    if (message.role === "user") return true;
    if (isAutoContextMessage(message.content)) return false;
    if (isPromptEchoContent(message.content)) return false;
    return message.content.trim().length > 0;
  });
}

export function buildArgosHistoryForModel(
  messages: ChatMessage[],
): { role: string; content: string }[] {
  return messages
    .filter((message) => {
      if (isAutoContextMessage(message.content)) return false;
      if (isArgosWelcomeMessage(message.content)) return false;
      if (isPromptEchoContent(message.content)) return false;
      return message.content.trim().length > 0;
    })
    .slice(-8)
    .map((message) => ({ role: message.role, content: message.content }));
}
