import { useState, useEffect, useCallback } from "react";
import { mergeBackendAndLocalConversations } from "@/lib/argosConversationUtils";
import {
  deriveConversationTitleFromMessage,
  isDefaultArgosDiscussionTitle,
} from "@/lib/argosDiscussionTitle";
import { fr } from "@/lib/i18n/fr";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reflection?: string;
  isGenerating?: boolean;
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

export interface UseArgosHistory {
  conversations: Conversation[];
  currentPatientId: string | null;
  currentConversationId: string | null;
  isLoaded: boolean;
  getConversations: () => Conversation[];
  getConversationsByPatient: (patientId: string) => Conversation[];
  getCurrentConversation: () => Conversation | null;
  createConversation: (patientId: string, patientName: string) => Conversation;
  hydrateConversation: (conversation: Conversation) => void;
  mergeConversationsFromBackend: (conversations: Conversation[]) => void;
  addMessage: (
    message: Omit<Message, "id">,
    conversationIdOverride?: string,
  ) => Message | undefined;
  updateMessageContent: (messageId: string, content: string) => void;
  updateMessageReflection: (messageId: string, reflection: string, isGenerating?: boolean) => void;
  updateMessageSections: (messageId: string, sections: Message["sections"]) => void;
  loadConversation: (conversationId: string) => Conversation | null;
  deleteConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, newTitle: string) => void;
  autoGenerateTitle: (conversationId: string) => void;
  updateTitleFromFirstMessage: (
    conversationId: string,
    userContent?: string,
  ) => string | null;
  getPatientGroups: () => { patientId: string; patientName: string; count: number; lastDate: Date }[];
  getConversationsByDate: () => Conversation[];
  setCurrentPatientId: (value: string | null) => void;
  setCurrentConversationId: (value: string | null) => void;
  replaceConversations: (conversations: Conversation[]) => void;
}

const LEGACY_STORAGE_KEY = "argos_conversations";

export function useArgosHistory(): UseArgosHistory {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // L'historique ARGOS est persisté côté API ; on purge l'ancien cache localStorage.
  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setIsLoaded(true);
  }, []);

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
        id: `local_${Date.now()}`,
        patientId,
        patientName,
        title: fr.argos.newConversation,
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

  const replaceConversations = useCallback((next: Conversation[]) => {
    setConversations(next);
  }, []);

  const mergeConversationsFromBackend = useCallback((fromBackend: Conversation[]) => {
    setConversations((prev) => mergeBackendAndLocalConversations(prev, fromBackend));
  }, []);

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

  // Met à jour le contenu d'un message existant (utile pour streaming).
  const updateMessageContent = useCallback(
    (messageId: string, content: string) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) =>
            msg.id === messageId ? { ...msg, content } : msg,
          ),
          updatedAt: new Date(),
        })),
      );
    },
    [],
  );

  const updateMessageReflection = useCallback(
    (messageId: string, reflection: string, isGenerating = true) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, reflection, isGenerating }
              : msg,
          ),
          updatedAt: new Date(),
        })),
      );
    },
    [],
  );

  // Met à jour les sections structurées d'un message existant.
  const updateMessageSections = useCallback(
    (messageId: string, sections: Message["sections"]) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) =>
            msg.id === messageId ? { ...msg, sections } : msg,
          ),
          updatedAt: new Date(),
        })),
      );
    },
    [],
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

  const autoGenerateTitle = useCallback(
    (firstMessage: string): string => deriveConversationTitleFromMessage(firstMessage),
    [],
  );

  const updateTitleFromFirstMessage = useCallback(
    (conversationId: string, userContent?: string): string | null => {
      const conversation = conversations.find((conv) => conv.id === conversationId);
      if (!conversation || !isDefaultArgosDiscussionTitle(conversation.title)) {
        return null;
      }

      const content =
        userContent?.trim() ||
        conversation.messages.find((msg) => msg.role === "user")?.content.trim();
      if (!content) return null;

      const computedTitle = deriveConversationTitleFromMessage(content);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, title: computedTitle, updatedAt: new Date() }
            : conv,
        ),
      );
      return computedTitle;
    },
    [conversations],
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
    updateMessageContent,
    updateMessageReflection,
    updateMessageSections,
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
    mergeConversationsFromBackend,
    replaceConversations,
  };
}
