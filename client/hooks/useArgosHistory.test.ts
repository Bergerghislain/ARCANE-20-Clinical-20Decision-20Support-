import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useArgosHistory } from "@/hooks/useArgosHistory";

describe("useArgosHistory", () => {
  it("renomme une discussion au premier message utilisateur (titre FR par défaut)", () => {
    const { result } = renderHook(() => useArgosHistory());

    let conversationId = "";
    act(() => {
      const conversation = result.current.createConversation("1", "Patient A");
      conversationId = conversation.id;
    });

    act(() => {
      result.current.addMessage(
        {
          role: "user",
          content: "Prochaine étape pour patient hypertendu",
          timestamp: new Date(),
        },
        conversationId,
      );
    });

    let newTitle: string | null = null;
    act(() => {
      newTitle = result.current.updateTitleFromFirstMessage(
        conversationId,
        "Prochaine étape pour patient hypertendu",
      );
    });

    expect(newTitle).toBe("Prochaine étape pour patient hypertendu");
    expect(
      result.current
        .getConversations()
        .find((c) => c.id === conversationId)?.title,
    ).toBe("Prochaine étape pour patient hypertendu");
  });

  it("loadConversation après merge dans le même tick ne pose pas l'ID actif", () => {
    const { result } = renderHook(() => useArgosHistory());

    const backendConversation = {
      id: "conv_42",
      patientId: "1",
      patientName: "Jean Dupont",
      title: "Discussion",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      messages: [
        {
          id: "m1",
          role: "user" as const,
          content: "Test persistance",
          timestamp: new Date(),
        },
      ],
    };

    act(() => {
      result.current.mergeConversationsFromBackend([backendConversation]);
      result.current.loadConversation("conv_42");
    });

    expect(result.current.currentConversationId).toBeNull();
    expect(result.current.getCurrentConversation()).toBeNull();
  });

  it("setCurrentConversationId après merge rouvre la discussion au rendu suivant", () => {
    const { result } = renderHook(() => useArgosHistory());

    const backendConversation = {
      id: "conv_42",
      patientId: "1",
      patientName: "Jean Dupont",
      title: "Discussion",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      messages: [
        {
          id: "m1",
          role: "user" as const,
          content: "Test persistance",
          timestamp: new Date(),
        },
      ],
    };

    act(() => {
      result.current.mergeConversationsFromBackend([backendConversation]);
      result.current.setCurrentConversationId("conv_42");
      result.current.setCurrentPatientId("1");
    });

    expect(result.current.currentConversationId).toBe("conv_42");
    expect(result.current.getCurrentConversation()?.id).toBe("conv_42");
  });

  it("ne remplace pas un titre déjà personnalisé", () => {
    const { result } = renderHook(() => useArgosHistory());

    let conversationId = "";
    act(() => {
      const conversation = result.current.createConversation("2", "Patient B");
      conversationId = conversation.id;
      result.current.renameConversation(conversationId, "Suivi post-opératoire");
    });

    act(() => {
      result.current.addMessage(
        {
          role: "user",
          content: "Nouvelle question",
          timestamp: new Date(),
        },
        conversationId,
      );
    });

    let newTitle: string | null = null;
    act(() => {
      newTitle = result.current.updateTitleFromFirstMessage(
        conversationId,
        "Nouvelle question",
      );
    });

    expect(newTitle).toBeNull();
    expect(
      result.current
        .getConversations()
        .find((c) => c.id === conversationId)?.title,
    ).toBe("Suivi post-opératoire");
  });
});
