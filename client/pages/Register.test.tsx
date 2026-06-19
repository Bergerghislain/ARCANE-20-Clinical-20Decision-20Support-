import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Register from "@/pages/Register";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("Register page", () => {
  it("affiche le formulaire d'inscription clinicien", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Créer un compte/i)).toBeInTheDocument();
  });

  it("valide la confirmation du mot de passe", async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByPlaceholderText(/clinicien@hopital/i), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText(/dr\.dupont/i), "dr.test");
    const passwordFields = document.querySelectorAll('input[type="password"]');
    await userEvent.type(passwordFields[0], "secret");
    await userEvent.type(passwordFields[1], "different");
    await userEvent.click(screen.getByRole("button", { name: /Créer le compte/i }));
    expect(
      await screen.findByText(/Les mots de passe ne correspondent pas/i),
    ).toBeInTheDocument();
  });
});
