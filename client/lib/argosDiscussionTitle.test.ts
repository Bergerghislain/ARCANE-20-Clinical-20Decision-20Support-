import { describe, expect, it } from "vitest";

import {
  DEFAULT_ARGOS_DISCUSSION_TITLES,
  deriveConversationTitleFromMessage,
  isDefaultArgosDiscussionTitle,
} from "@/lib/argosDiscussionTitle";
import { fr } from "@/lib/i18n/fr";

describe("argosDiscussionTitle", () => {
  it("reconnaît les titres par défaut EN et FR", () => {
    expect(isDefaultArgosDiscussionTitle("New Conversation")).toBe(true);
    expect(isDefaultArgosDiscussionTitle(fr.argos.newConversation)).toBe(true);
    expect(isDefaultArgosDiscussionTitle("ARGOS Discussion")).toBe(true);
    expect(isDefaultArgosDiscussionTitle("  Nouvelle conversation  ")).toBe(true);
    expect(isDefaultArgosDiscussionTitle("Douleur thoracique aiguë")).toBe(false);
  });

  it("génère un titre thématique à partir du message", () => {
    expect(
      deriveConversationTitleFromMessage("Quelle est la prochaine étape pour ce patient ?"),
    ).toBe("Quelle est la prochaine étape pour ce patient ?");
    const long = "a".repeat(60);
    expect(deriveConversationTitleFromMessage(long)).toBe(`${"a".repeat(50)}...`);
    expect(deriveConversationTitleFromMessage("   ")).toBe(fr.argos.newConversation);
  });

  it("expose les libellés par défaut connus", () => {
    expect(DEFAULT_ARGOS_DISCUSSION_TITLES.has("New Conversation")).toBe(true);
  });
});
