import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import Index from "@/pages/Index";

describe("Index landing page", () => {
  it("présente ARCANE et les actions de connexion", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Clinical Decision Support for Rare Cancers/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThan(0);
  });
});
