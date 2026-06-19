import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClinicalDisclaimer } from "@/components/argos/ClinicalDisclaimer";

describe("ClinicalDisclaimer", () => {
  it("affiche le garde-fou clinique", () => {
    render(<ClinicalDisclaimer />);
    expect(screen.getByRole("note", { name: /avertissement clinique/i })).toBeInTheDocument();
    expect(screen.getByText(/aide à la décision clinique/i)).toBeInTheDocument();
    expect(screen.getByText(/ne se substitue pas au jugement médical/i)).toBeInTheDocument();
  });

  it("affiche la version de prompt si fournie", () => {
    render(<ClinicalDisclaimer promptVersion="2024.1" />);
    expect(screen.getByText(/prompt v2024\.1/i)).toBeInTheDocument();
  });
});
