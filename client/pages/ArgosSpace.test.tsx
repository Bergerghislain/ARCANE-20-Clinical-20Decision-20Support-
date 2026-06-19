import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ArgosSpace from "@/pages/ArgosSpace";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/argos/WelcomeScreen", () => ({
  WelcomeScreen: () => <div data-testid="welcome-screen">Welcome</div>,
}));

vi.mock("@/components/argos/PatientSelector", () => ({
  PatientSelector: () => <div data-testid="patient-selector" />,
}));

vi.mock("@/components/argos/ArgosSidebar", () => ({
  ArgosSidebar: () => <div data-testid="argos-sidebar" />,
}));

vi.mock("@/lib/argosApi", () => ({
  createArgosDiscussion: vi.fn(),
  fetchArgosDiscussions: vi.fn().mockResolvedValue([]),
  fetchArgosMessages: vi.fn().mockResolvedValue([]),
  postArgosMessage: vi.fn(),
}));

vi.mock("@/lib/patientReport", () => ({
  buildArgosContextFromProfile: vi.fn(() => "ctx"),
  buildSimulatedAiReport: vi.fn(() => ({ conclusion: "c", reasoning: "r", sources: [] })),
  loadPatientReportProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const historyMock = {
  getCurrentConversation: vi.fn(() => null),
  getConversations: vi.fn(() => []),
  getConversationsByPatient: vi.fn(() => []),
  setCurrentPatientId: vi.fn(),
  setCurrentConversationId: vi.fn(),
  loadConversation: vi.fn(),
  createConversation: vi.fn(() => ({ id: "conv_1", title: "t" })),
  hydrateConversation: vi.fn(),
  addMessage: vi.fn(),
  updateTitleFromFirstMessage: vi.fn(),
  deleteConversation: vi.fn(),
  renameConversation: vi.fn(),
  updateMessageContent: vi.fn(),
  updateMessageSections: vi.fn(),
  currentConversationId: null,
  currentPatientId: null,
};

vi.mock("@/hooks/useArgosHistory", () => ({
  useArgosHistory: () => historyMock,
}));

describe("ArgosSpace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche l'écran d'accueil quand aucune conversation n'est active", () => {
    render(
      <MemoryRouter>
        <ArgosSpace />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
    expect(screen.getByTestId("argos-sidebar")).toBeInTheDocument();
  });
});
