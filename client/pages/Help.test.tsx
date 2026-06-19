import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Help from "@/pages/Help";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("Help", () => {
  it("affiche les rubriques d'aide et le support", () => {
    render(
      <MemoryRouter>
        <Help />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /^help$/i })).toBeInTheDocument();
    expect(screen.getByText(/patient dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/ARGOS Space/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toBeInTheDocument();
  });
});
