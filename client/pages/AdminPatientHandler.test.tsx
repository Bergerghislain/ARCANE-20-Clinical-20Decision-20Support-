import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPatientHandler from "@/pages/AdminPatientHandler";
import { apiFetch } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

const navigateMock = vi.fn();

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getStoredUser: vi.fn(),
  };
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function renderPatientHandler() {
  return render(
    <MemoryRouter>
      <AdminPatientHandler />
    </MemoryRouter>,
  );
}

describe("AdminPatientHandler flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredUser).mockReturnValue({
      id: 1,
      username: "admin",
      email: "admin@arcane.local",
      role: "admin",
    });

    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/api/admin/users?status=ACTIF") {
        return jsonResponse([
          {
            id: 10,
            email: "alice@arcane.local",
            username: "alice",
            role: "clinician",
            is_active: true,
          },
        ]);
      }
      if (path === "/api/admin/users?status=EN_ATTENTE") {
        return jsonResponse([
          {
            id: 11,
            email: "bob@arcane.local",
            username: "bob",
            role: "clinician",
            is_active: false,
          },
        ]);
      }
      if (path === "/api/patients?limit=200&offset=0") {
        return jsonResponse([
          {
            id_patient: 1,
            name: "Marie Dubois",
            ipp: "MRN-001",
            status: "active",
            assigned_clinician_id: 10,
          },
          {
            id_patient: 2,
            name: "Jean Martin",
            ipp: "MRN-002",
            status: "pending",
            assigned_clinician_id: 11,
          },
        ]);
      }
      if (path === "/api/patients/2/assign") {
        return jsonResponse({ patient_id: 2, assigned_clinician_id: 10 });
      }
      return jsonResponse([]);
    });
  });

  it("charge les donnees admin et affiche les patients", async () => {
    renderPatientHandler();

    expect(await screen.findByText("Marie Dubois")).toBeInTheDocument();
    expect(screen.getByText("Jean Martin")).toBeInTheDocument();
    expect(screen.getByText("alice (ACTIF)")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/users?status=ACTIF");
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/users?status=EN_ATTENTE");
    expect(apiFetch).toHaveBeenCalledWith("/api/patients?limit=200&offset=0");
  });

  it("reaffecte un patient vers un autre clinicien", async () => {
    const user = userEvent.setup();
    renderPatientHandler();

    const row = (await screen.findByText("Jean Martin")).closest("tr");
    expect(row).not.toBeNull();

    const scoped = within(row as HTMLElement);
    await user.selectOptions(scoped.getByRole("combobox"), "10");
    await user.click(scoped.getByRole("button", { name: "Reaffecter" }));

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/patients/2/assign",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ clinician_id: 10 }),
      }),
    );
    expect(
      await screen.findByText(/Jean Martin \(MRN-002\) reassigne vers alice/i),
    ).toBeInTheDocument();
  });

  it("bloque la vue si l'utilisateur n'est pas admin", async () => {
    vi.mocked(getStoredUser).mockReturnValue({
      id: 7,
      username: "clinician",
      email: "c@arcane.local",
      role: "clinician",
    });

    renderPatientHandler();

    expect(await screen.findByText(/Acces refuse/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
