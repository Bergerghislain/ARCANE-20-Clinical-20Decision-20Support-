import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Index from "@/pages/Index";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

describe("Index (landing)", () => {
  it("affiche le hero et redirige vers le login", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /clinical decision support for rare cancers/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /get started/i }));
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });
});
