import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ForgotPassword from "@/pages/ForgotPassword";

describe("ForgotPassword page", () => {
  it("informe que la fonctionnalité arrive plus tard", () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Mot de passe oublié/i)).toBeInTheDocument();
    expect(
      screen.getByText(/prochaine itération/i),
    ).toBeInTheDocument();
  });
});
