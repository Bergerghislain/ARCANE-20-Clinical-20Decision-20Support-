import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Login from "@/pages/Login";
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

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("valide les champs obligatoires", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/please fill in all fields/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("se connecte et redirige vers le dashboard", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(jsonResponse({ token: "tok", user: { id: 1, role: "clinician" } }))
      .mockResolvedValueOnce(jsonResponse([], true));

    renderLogin();
    await user.type(screen.getByPlaceholderText(/doctor@arcane/i), "admin");
    await user.type(screen.getByPlaceholderText("••••••••"), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
    expect(localStorage.getItem("arcane_auth_token")).toBe("tok");
  });

  it("affiche une erreur si identifiants invalides", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce(jsonResponse({}, false, 401));

    renderLogin();
    await user.type(screen.getByPlaceholderText(/doctor@arcane/i), "admin");
    await user.type(screen.getByPlaceholderText("••••••••"), "bad");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith("/dashboard");
  });

  it("propose la navigation vers l'inscription", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole("button", { name: /créer un compte clinicien/i }));
    expect(navigateMock).toHaveBeenCalledWith("/register");
  });
});
