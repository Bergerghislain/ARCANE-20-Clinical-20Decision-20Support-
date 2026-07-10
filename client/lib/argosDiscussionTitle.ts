import { fr } from "@/lib/i18n/fr";

/** Titres par défaut (EN backend, FR UI, libellés historiques). */
export const DEFAULT_ARGOS_DISCUSSION_TITLES = new Set([
  "New Conversation",
  fr.argos.newConversation,
  "ARGOS Discussion",
  "Discussion ARGOS",
]);

export function isDefaultArgosDiscussionTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const normalized = title.trim();
  if (!normalized) return true;
  return DEFAULT_ARGOS_DISCUSSION_TITLES.has(normalized);
}

/** Dérive un titre court à partir du premier message utilisateur. */
export function deriveConversationTitleFromMessage(
  content: string,
  maxLength = 50,
): string {
  let title = content.trim().replace(/\s+/g, " ");
  if (!title) return fr.argos.newConversation;
  if (title.length > maxLength) {
    title = `${title.slice(0, maxLength)}...`;
  }
  return title;
}
