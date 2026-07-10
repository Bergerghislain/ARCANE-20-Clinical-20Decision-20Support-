import { describe, expect, it } from "vitest";

import type { Conversation } from "@/hooks/useArgosHistory";
import {
  filterVisibleArgosConversations,
  mergeBackendAndLocalConversations,
} from "@/lib/argosConversationUtils";

function makeConv(
  id: string,
  patientId: string,
  messages: Conversation["messages"],
): Conversation {
  return {
    id,
    patientId,
    patientName: "Test",
    title: "Discussion",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages,
  };
}

describe("argosConversationUtils", () => {
  it("fusionne backend et local sans doublon", () => {
    const existing = [makeConv("local_1", "general", [])];
    const backend = [makeConv("conv_1", "1", [])];
    const merged = mergeBackendAndLocalConversations(existing, backend);
    expect(merged).toHaveLength(2);
    expect(merged.map((c) => c.id).sort()).toEqual(["conv_1", "local_1"]);
  });

  it("masque les discussions vides sans message utilisateur", () => {
    const conversations = [
      makeConv("conv_1", "1", [
        {
          id: "m1",
          role: "assistant",
          content: "Bienvenue",
          timestamp: new Date(),
        },
      ]),
      makeConv("conv_2", "1", [
        {
          id: "m2",
          role: "user",
          content: "Question",
          timestamp: new Date(),
        },
      ]),
    ];
    const visible = filterVisibleArgosConversations(conversations, null);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("conv_2");
  });
});
