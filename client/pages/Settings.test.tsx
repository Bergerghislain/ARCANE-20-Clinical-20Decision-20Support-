import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Settings from "@/pages/Settings";
import { getStoredUser } from "@/lib/auth";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth", () => ({ getStoredUser: vi.fn() }));

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe("Settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche les informations du compte connecté", () => {
    vi.mocked(getStoredUser).mockReturnValue({
      id: 1,
      email: "admin@arcane.com",
      username: "adminuser",
      role: "admin",
    });
    renderSettings();
    expect(screen.getByText("admin@arcane.com")).toBeInTheDocument();
    expect(screen.getByText("adminuser")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("affiche des tirets si aucun utilisateur", () => {
    vi.mocked(getStoredUser).mockReturnValue(null);
    renderSettings();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});
