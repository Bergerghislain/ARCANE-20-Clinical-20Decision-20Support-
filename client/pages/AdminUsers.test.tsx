import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminUsers from "@/pages/AdminUsers";
import { apiFetch } from "@/lib/api";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("AdminUsers page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (String(path).includes("EN_ATTENTE")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 10,
              username: "pending.clin1",
              email: "pending1@arcane.com",
              role: "clinician",
              full_name: "Dr Pending",
              is_active: false,
            },
          ],
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });
  });

  it("charge les utilisateurs en attente", async () => {
    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/admin/users?status=EN_ATTENTE");
    });
    expect(await screen.findByText(/pending1@arcane.com/i)).toBeInTheDocument();
  });
});
