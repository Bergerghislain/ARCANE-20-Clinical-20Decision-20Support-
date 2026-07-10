import { describe, expect, it } from "vitest";

import type { Conversation } from "@/hooks/useArgosHistory";
import {
  persistArgosSession,
  pickConversationToRestore,
  readArgosSession,
} from "@/lib/argosSession";

function makeConv(id: string, hasUserMessage: boolean): Conversation {
  return {
    id,
    patientId: "1",
    patientName: "Patient",
    title: "Discussion",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    messages: hasUserMessage
      ? [
          {
            id: "m1",
            role: "user",
            content: "Question",
            timestamp: new Date(),
          },
        ]
      : [
          {
            id: "m0",
            role: "assistant",
            content: "Bienvenue",
            timestamp: new Date(),
          },
        ],
  };
}

describe("argosSession", () => {
  it("persiste et relit la session active", () => {
    sessionStorage.clear();
    persistArgosSession("conv_9", "3");
    expect(readArgosSession()).toEqual({
      conversationId: "conv_9",
      patientId: "3",
    });
  });

  it("restaure la conversation de session si elle existe", () => {
    const conversations = [makeConv("conv_1", true), makeConv("conv_2", true)];
    const restored = pickConversationToRestore(conversations, {
      conversationId: "conv_2",
      patientId: "1",
    });
    expect(restored?.id).toBe("conv_2");
  });

  it("retombe sur la discussion la plus récente avec message utilisateur", () => {
    const conversations = [
      makeConv("conv_1", false),
      makeConv("conv_2", true),
    ];
    const restored = pickConversationToRestore(conversations, {
      conversationId: "conv_missing",
      patientId: null,
    });
    expect(restored?.id).toBe("conv_2");
  });
});
