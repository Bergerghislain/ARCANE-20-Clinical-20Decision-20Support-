import { describe, expect, it } from "vitest";

import type { Conversation } from "@/hooks/useArgosHistory";
import {
  buildArgosHistoryForModel,
  filterVisibleArgosConversations,
  filterVisibleChatMessages,
  isAutoContextMessage,
  isPromptEchoContent,
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

  it("masque le contexte auto-charge et les echos JSON dans le chat", () => {
    const messages = [
      {
        id: "u1",
        role: "user" as const,
        content: "Prochaines étapes ?",
        timestamp: new Date(),
      },
      {
        id: "ctx",
        role: "assistant" as const,
        content: "[Contexte Patient Auto Charge]\nContexte patient auto-charge: Jean",
        timestamp: new Date(),
      },
      {
        id: "echo",
        role: "assistant" as const,
        content: '{"user_message":"test","output_format":{},"constraints":[]}',
        timestamp: new Date(),
      },
      {
        id: "ok",
        role: "assistant" as const,
        content: "Synthèse clinique utile.",
        timestamp: new Date(),
      },
    ];
    const visible = filterVisibleChatMessages(messages);
    expect(visible.map((m) => m.id)).toEqual(["u1", "ok"]);
    expect(isAutoContextMessage(messages[1].content)).toBe(true);
    expect(isPromptEchoContent(messages[2].content)).toBe(true);
  });

  it("construit un historique modele sans pollution", () => {
    const history = buildArgosHistoryForModel([
      { role: "assistant", content: "Bonjour, je suis ARGOS" },
      { role: "user", content: "Question clinique" },
      {
        role: "assistant",
        content: "Contexte patient auto-charge: Patient 1",
      },
    ]);
    expect(history).toEqual([{ role: "user", content: "Question clinique" }]);
  });
});
