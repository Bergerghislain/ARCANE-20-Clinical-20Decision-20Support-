import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Settings from "@/pages/Settings";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth", () => ({
  getStoredUser: vi.fn(() => ({
    email: "admin@arcane.com",
    role: "admin",
    username: "admin",
  })),
}));

describe("Settings page", () => {
  it("affiche les informations de session", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Paramètres/i })).toBeInTheDocument();
    expect(screen.getByText("admin@arcane.com")).toBeInTheDocument();
  });
});
