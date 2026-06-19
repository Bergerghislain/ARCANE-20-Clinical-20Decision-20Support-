import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Help from "@/pages/Help";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth", () => ({
  getStoredUser: vi.fn(() => ({ email: "admin@arcane.com", role: "admin" })),
}));

describe("Help page", () => {
  it("liste les sujets d'aide principaux", () => {
    render(
      <MemoryRouter>
        <Help />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Patient dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/ARGOS Space/i)).toBeInTheDocument();
  });
});
