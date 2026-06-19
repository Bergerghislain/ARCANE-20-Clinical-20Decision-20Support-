import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Login from "@/pages/Login";
import { apiFetch } from "@/lib/api";
import * as auth from "@/lib/auth";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  isAuthenticated: vi.fn(() => false),
  setAuth: vi.fn(),
}));

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le formulaire de connexion", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  it("refuse la soumission si les champs sont vides", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    expect(await screen.findByText(/Please fill in all fields/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("connecte l'utilisateur avec des identifiants valides", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/login") {
        return {
          ok: true,
          json: async () => ({
            token: "jwt",
            user: { id: 1, email: "admin@arcane.com", role: "admin" },
          }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText(/doctor@arcane/i), "admin@arcane.com");
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), "password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await vi.waitFor(() => {
      expect(auth.setAuth).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
