import { useState, useEffect, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sections?: {
    clinicalSynthesis: string;
    hypotheses: string[];
    arguments: string[];
    nextSteps: string[];
    traceability: string;
  };
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

const STORAGE_KEY = "argos_conversations";

// Helper to serialize/deserialize dates
function serializeConversation(conv: Conversation): any {
  return {
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: conv.messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    })),
  };
}

function deserializeConversation(data: any): Conversation {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    messages: data.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  };
}

export function useArgosHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const deserialized = parsed.map(deserializeConversation);
        setConversations(deserialized);
      } catch (error) {
        console.error("Failed to load conversations from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      const serialized = conversations.map(serializeConversation);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    }
  }, [conversations, isLoaded]);

  // Get all conversations
  const getConversations = useCallback(() => {
    return conversations;
  }, [conversations]);

  // Get conversations for a specific patient
  const getConversationsByPatient = useCallback(
    (patientId: string) => {
      return conversations.filter((conv) => conv.patientId === patientId);
    },
    [conversations],
  );

  // Get current active conversation
  const getCurrentConversation = useCallback(() => {
    if (!currentConversationId) return null;
    return (
      conversations.find((conv) => conv.id === currentConversationId) || null
    );
  }, [conversations, currentConversationId]);

  // Create a new conversation
  const createConversation = useCallback(
    (patientId: string, patientName: string) => {
      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        patientId,
        patientName,
        title: "New Conversation",
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content:
              "Hello, I am ARGOS, your clinical decision support assistant. I am ready to help you with clinical reasoning for this patient case. Please share your clinical question or context.",
            timestamp: new Date(),
          },
        ],
      };

      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
      setCurrentPatientId(patientId);

      return newConversation;
    },
    [],
  );

  // Hydrate a conversation from an external source (e.g. backend)
  const hydrateConversation = useCallback(
    (conversation: Conversation) => {
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== conversation.id);
        return [conversation, ...others];
      });
      setCurrentConversationId(conversation.id);
      setCurrentPatientId(conversation.patientId);
    },
    [],
  );

  // Add message to current conversation
  const addMessage = useCallback(
    (message: Omit<Message, "id">, conversationIdOverride?: string) => {
      const targetConversationId =
        conversationIdOverride ?? currentConversationId;
      if (!targetConversationId) return;

      const messageWithId: Message = {
        ...message,
        id: `msg_${Date.now()}`,
      };

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === targetConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, messageWithId],
              updatedAt: new Date(),
            };
          }
          return conv;
        }),
      );

      return messageWithId;
    },
    [currentConversationId],
  );

  // Load a conversation
  const loadConversation = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find(
        (conv) => conv.id === conversationId,
      );
      if (conversation) {
        setCurrentConversationId(conversationId);
        setCurrentPatientId(conversation.patientId);
        return conversation;
      }
      return null;
    },
    [conversations],
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId),
      );

      // If we deleted the current conversation, clear selection
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
    },
    [currentConversationId],
  );

  // Rename a conversation
  const renameConversation = useCallback(
    (conversationId: string, newTitle: string) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              title: newTitle,
              updatedAt: new Date(),
            };
          }
          return conv;
        }),
      );
    },
    [],
  );

  // Auto-generate title from first user message
  const autoGenerateTitle = useCallback((firstMessage: string): string => {
    const maxLength = 50;
    let title = firstMessage.trim();

    // Remove extra whitespace and newlines
    title = title.replace(/\s+/g, " ");

    // Truncate if too long
    if (title.length > maxLength) {
      title = title.substring(0, maxLength) + "...";
    }

    return title;
  }, []);

  // Update title to auto-generated one after first user message
  const updateTitleFromFirstMessage = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find(
        (conv) => conv.id === conversationId,
      );
      if (conversation) {
        // Find the first user message
        const firstUserMessage = conversation.messages.find(
          (msg) => msg.role === "user",
        );
        if (firstUserMessage && conversation.title === "New Conversation") {
          const newTitle = autoGenerateTitle(firstUserMessage.content);
          renameConversation(conversationId, newTitle);
        }
      }
    },
    [conversations, autoGenerateTitle, renameConversation],
  );

  // Get all unique patients with their conversation count
  const getPatientGroups = useCallback(() => {
    const patientMap = new Map<
      string,
      { patientName: string; count: number; lastDate: Date }
    >();

    conversations.forEach((conv) => {
      if (!patientMap.has(conv.patientId)) {
        patientMap.set(conv.patientId, {
          patientName: conv.patientName,
          count: 0,
          lastDate: conv.updatedAt,
        });
      }

      const group = patientMap.get(conv.patientId)!;
      group.count += 1;
      if (conv.updatedAt > group.lastDate) {
        group.lastDate = conv.updatedAt;
      }
    });

    return Array.from(patientMap.entries()).map(([patientId, data]) => ({
      patientId,
      ...data,
    }));
  }, [conversations]);

  // Get conversations sorted by date (most recent first)
  const getConversationsByDate = useCallback(() => {
    return [...conversations].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }, [conversations]);

  return {
    conversations,
    currentPatientId,
    currentConversationId,
    isLoaded,
    getConversations,
    getConversationsByPatient,
    getCurrentConversation,
    createConversation,
    addMessage,
    loadConversation,
    deleteConversation,
    renameConversation,
    autoGenerateTitle,
    updateTitleFromFirstMessage,
    getPatientGroups,
    getConversationsByDate,
    setCurrentPatientId,
    setCurrentConversationId,
    hydrateConversation,
  };
}
