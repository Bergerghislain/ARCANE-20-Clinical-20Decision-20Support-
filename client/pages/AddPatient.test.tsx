import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AddPatient from "@/pages/AddPatient";
import { apiFetch } from "@/lib/api";

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

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function renderAddPatient() {
  return render(
    <MemoryRouter>
      <AddPatient />
    </MemoryRouter>,
  );
}

describe("AddPatient flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige vers le dossier patient avec la cle id", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ id: 42 }, true, 201));

    renderAddPatient();
    await user.type(screen.getByPlaceholderText("Name"), "Patient Test");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/patients",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/patient/42");
  });

  it("redirige vers le dossier patient avec la cle id_patient", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse({ id_patient: 77 }, true, 201),
    );

    renderAddPatient();
    await user.type(screen.getByPlaceholderText("Name"), "Patient Alias");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(navigateMock).toHaveBeenCalledWith("/patient/77");
  });

  it("affiche un message d'erreur en cas d'echec API", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse({ detail: "Payload invalide" }, false, 422),
    );

    renderAddPatient();
    await user.type(screen.getByPlaceholderText("Name"), "Patient KO");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/Payload invalide/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith("/patient/42");
  });
});
