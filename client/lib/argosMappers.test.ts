import { describe, expect, it } from "vitest";

import {
  ARGOS_WELCOME_MESSAGE,
  backendDiscussionIdFromConversationId,
  conversationIdFromBackendDiscussionId,
  mapArgosMessageToMessage,
  mapDiscussionToConversation,
} from "@/lib/argosMappers";

describe("argosMappers", () => {
  it("convertit les identifiants discussion backend ↔ conversation", () => {
    expect(conversationIdFromBackendDiscussionId(42)).toBe("conv_42");
    expect(backendDiscussionIdFromConversationId("conv_42")).toBe(42);
    expect(backendDiscussionIdFromConversationId("conv_local_123")).toBeNull();
  });

  it("mappe un message API vers le modèle UI", () => {
    const mapped = mapArgosMessageToMessage({
      id: 7,
      discussion_id: 42,
      message_type: "user_query",
      content: "Question clinique",
      created_at: "2025-01-15T10:00:00.000Z",
    });
    expect(mapped.id).toBe("msg_7");
    expect(mapped.role).toBe("user");
    expect(mapped.content).toBe("Question clinique");
  });

  it("mappe les sections structurées et les réponses assistant", () => {
    const mapped = mapArgosMessageToMessage({
      id: 8,
      discussion_id: 42,
      message_type: "argos_response",
      content: "Synthèse",
      created_at: "2025-01-15T10:00:00.000Z",
      sections: {
        clinicalSynthesis: "Résumé",
        hypotheses: ["H1"],
        arguments: ["A1"],
        nextSteps: ["S1"],
        traceability: "Source",
      },
    });
    expect(mapped.role).toBe("assistant");
    expect(mapped.sections?.clinicalSynthesis).toBe("Résumé");
    expect(mapped.sections?.hypotheses).toEqual(["H1"]);
  });

  it("hydrate une discussion backend avec message d'accueil si vide", () => {
    const conversation = mapDiscussionToConversation(
      {
        id: 3,
        patient_id: 12,
        clinician_id: 1,
        title: null,
        context: null,
        status: "active",
        created_at: "2025-01-15T10:00:00.000Z",
        updated_at: "2025-01-15T11:00:00.000Z",
      },
      [],
      "Martin Dupont",
    );
    expect(conversation.id).toBe("conv_3");
    expect(conversation.patientName).toBe("Martin Dupont");
    expect(conversation.title).toBe("ARGOS Discussion");
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].content).toBe(ARGOS_WELCOME_MESSAGE);
  });

  it("mappe une discussion backend avec messages existants", () => {
    const conversation = mapDiscussionToConversation(
      {
        id: 5,
        patient_id: 2,
        clinician_id: 1,
        title: "Douleur thoracique",
        context: null,
        status: "active",
        created_at: "2025-01-15T10:00:00.000Z",
        updated_at: "2025-01-15T12:00:00.000Z",
      },
      [
        {
          id: 1,
          discussion_id: 5,
          message_type: "user_query",
          content: "Question",
          created_at: "2025-01-15T10:30:00.000Z",
        },
      ],
      "Patient Test",
    );
    expect(conversation.title).toBe("Douleur thoracique");
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].role).toBe("user");
  });
});
