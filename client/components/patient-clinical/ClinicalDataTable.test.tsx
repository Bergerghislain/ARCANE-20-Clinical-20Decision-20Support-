import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClinicalDataTable } from "./ClinicalDataTable";

describe("ClinicalDataTable", () => {
  it("affiche le libellé vide si aucune ligne", () => {
    render(
      <ClinicalDataTable
        rows={[]}
        emptyLabel="Aucune mesure."
        rowKey={(_, index) => `row-${index}`}
        columns={[{ key: "a", header: "Col A", render: () => "—" }]}
      />,
    );

    expect(screen.getByText("Aucune mesure.")).toBeInTheDocument();
  });

  it("affiche les en-têtes et les cellules", () => {
    render(
      <ClinicalDataTable
        rows={[{ name: "Alice" }]}
        rowKey={(row) => String((row as { name: string }).name)}
        columns={[
          {
            key: "name",
            header: "Nom",
            render: (row) => (row as { name: string }).name,
          },
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Nom" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();
  });
});
