import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminUsers from "@/pages/AdminUsers";
import { apiFetch } from "@/lib/api";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

function resp(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

describe("AdminUsers (RBAC + workflow)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("charge les comptes en attente et les cliniciens actifs", async () => {
    vi.mocked(apiFetch).mockImplementation(async (url: string) => {
      if (url.includes("EN_ATTENTE")) {
        return resp([{ id: 10, email: "new@h.fr", username: "newdoc", role: "clinician", is_active: false }]);
      }
      return resp([{ id: 2, email: "active@h.fr", username: "activedoc", role: "clinician", is_active: true }]);
    });

    renderAdmin();
    expect(await screen.findByText("new@h.fr")).toBeInTheDocument();
    expect(await screen.findByText("active@h.fr")).toBeInTheDocument();
  });

  it("affiche un accès refusé sur 403 (non-admin)", async () => {
    vi.mocked(apiFetch).mockResolvedValue(resp(null, false, 403));
    renderAdmin();
    expect(await screen.findByText(/accès refusé/i)).toBeInTheDocument();
  });

  it("valide un compte en attente (approve)", async () => {
    vi.mocked(apiFetch).mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return resp({ id: 10, email: "new@h.fr", username: "newdoc", role: "clinician", is_active: true });
      }
      if (url.includes("EN_ATTENTE")) {
        return resp([{ id: 10, email: "new@h.fr", username: "newdoc", role: "clinician", is_active: false }]);
      }
      return resp([]);
    });

    const user = userEvent.setup();
    renderAdmin();
    const approveBtn = await screen.findByRole("button", { name: /valider clinicien/i });
    await user.click(approveBtn);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/admin/users/10/validate",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
