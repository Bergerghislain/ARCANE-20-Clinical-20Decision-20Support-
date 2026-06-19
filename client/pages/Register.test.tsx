import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Register from "@/pages/Register";
import { apiFetch } from "@/lib/api";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, password: string, confirm: string) {
  await user.type(screen.getByPlaceholderText(/clinicien@hopital/i), "doc@hopital.fr");
  await user.type(screen.getByPlaceholderText("dr.dupont"), "drdoc");
  const pwInputs = document.querySelectorAll('input[type="password"]');
  await user.type(pwInputs[0] as HTMLElement, password);
  await user.type(pwInputs[1] as HTMLElement, confirm);
}

describe("Register flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si les mots de passe ne correspondent pas", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillForm(user, "secret123", "different");
    await user.click(screen.getByRole("button", { name: /créer le compte/i }));
    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("crée le compte et affiche le message de succès", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce(jsonResponse({ id: 5 }, true, 201));
    renderRegister();
    await fillForm(user, "secret123", "secret123");
    await user.click(screen.getByRole("button", { name: /créer le compte/i }));

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText(/compte créé/i)).toBeInTheDocument();
  });

  it("affiche l'erreur API détaillée", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce(jsonResponse({ detail: "Email déjà utilisé" }, false, 409));
    renderRegister();
    await fillForm(user, "secret123", "secret123");
    await user.click(screen.getByRole("button", { name: /créer le compte/i }));
    expect(await screen.findByText(/email déjà utilisé/i)).toBeInTheDocument();
  });
});
