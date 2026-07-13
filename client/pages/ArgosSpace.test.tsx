import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ArgosSpace from "@/pages/ArgosSpace";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useArgosHistory", () => ({
  useArgosHistory: () => ({
    getConversations: () => [],
    getCurrentConversation: () => null,
    currentConversationId: null,
    currentPatientId: null,
    isLoaded: true,
    getConversationsByPatient: () => [],
    createConversation: vi.fn(),
    loadConversation: vi.fn(),
    deleteConversation: vi.fn(),
    renameConversation: vi.fn(),
    setCurrentPatientId: vi.fn(),
    setCurrentConversationId: vi.fn(),
    addMessage: vi.fn(),
    updateMessageContent: vi.fn(),
    updateMessageSections: vi.fn(),
    updateTitleFromFirstMessage: vi.fn(),
    hydrateConversation: vi.fn(),
    mergeConversationsFromBackend: vi.fn(),
    replaceConversations: vi.fn(),
  }),
}));

vi.mock("@/hooks/useArgosPatients", () => ({
  useArgosPatients: () => ({
    patients: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/llmStatus", () => ({
  fetchLlmStatus: vi.fn(async () => ({
    provider: "mock_json",
    ready: true,
    message: "Mode simulation",
  })),
  formatLlmSetupHint: vi.fn((status: { message: string }) => status.message),
}));

vi.mock("@/lib/argosApi", () => ({
  createArgosDiscussion: vi.fn(),
  fetchArgosDiscussions: vi.fn(async () => []),
  fetchArgosMessages: vi.fn(async () => []),
  postArgosMessage: vi.fn(),
  updateArgosDiscussion: vi.fn(),
}));

describe("ArgosSpace page", () => {
  it("affiche l'écran d'accueil ARGOS", () => {
    renderWithProviders(<ArgosSpace />);
    expect(screen.getByRole("heading", { name: /Assistant clinique ARGOS/i })).toBeInTheDocument();
  });
});
