import { describe, expect, it } from "vitest";

import { mapApiPatientToArgos } from "@/hooks/useArgosPatients";

describe("mapApiPatientToArgos", () => {
  it("utilise id_patient numerique et libelle lisible", () => {
    const mapped = mapApiPatientToArgos({
      id: "42",
      name: "Marie Dubois",
      age: 52,
      condition: "Lymphome rare",
      mrn: "IPP-001",
      status: "active",
    });
    expect(mapped).toMatchObject({
      id: "42",
      name: "Marie Dubois",
      age: 52,
      condition: "Lymphome rare",
      mrn: "IPP-001",
      status: "active",
    });
  });

  it("applique des fallbacks si champs manquants", () => {
    const mapped = mapApiPatientToArgos({
      id: "7",
      name: null,
      age: null,
      condition: null,
      mrn: null,
      status: null,
    });
    expect(mapped.name).toBe("Patient 7");
    expect(mapped.condition).toBe("Diagnostic non renseigné");
    expect(mapped.age).toBe(0);
  });
});
