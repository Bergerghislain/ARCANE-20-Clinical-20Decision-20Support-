import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import NotFound from "@/pages/NotFound";

describe("NotFound page", () => {
  it("affiche le message 404 et les liens de navigation", () => {
    render(
      <MemoryRouter initialEntries={["/route-inconnue"]}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
