import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ForgotPassword from "@/pages/ForgotPassword";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

describe("ForgotPassword", () => {
  it("affiche le message et revient à la connexion", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );
    expect(screen.getByText(/mot de passe oublié/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retour à la connexion/i }));
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });
});
