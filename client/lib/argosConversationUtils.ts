import type { Conversation } from "@/hooks/useArgosHistory";

/** Discussions locales (discussion générale) — distinctes des IDs backend `conv_<id>`. */
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
