import { describe, expect, it } from "vitest";

import {
  backendDiscussionIdFromConversationId,
  conversationIdFromBackendDiscussionId,
  mapArgosMessageToMessage,
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
});
