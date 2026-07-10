import { describe, expect, it } from "vitest";

import {
  extractPartialJsonString,
  hasPartialJsonField,
} from "@/lib/aiStreamPartialJson";

describe("aiStreamPartialJson", () => {
  it("extrait une string partielle pendant le streaming", () => {
    const raw = '{"reflection": "Étape 1 : analyser le';
    expect(extractPartialJsonString(raw, "reflection")).toBe(
      "Étape 1 : analyser le",
    );
    expect(hasPartialJsonField(raw, "reflection")).toBe(true);
    expect(hasPartialJsonField(raw, "conclusion")).toBe(false);
  });

  it("gère les échappements JSON", () => {
    const raw = '{"reflection": "Ligne 1\\nLigne 2"}';
    expect(extractPartialJsonString(raw, "reflection")).toBe("Ligne 1\nLigne 2");
  });

  it("retourne une chaîne vide si le champ est absent ou incomplet", () => {
    expect(extractPartialJsonString('{"other": "x"}', "reflection")).toBe("");
    expect(extractPartialJsonString('{"reflection":', "reflection")).toBe("");
    expect(hasPartialJsonField('{"reflection": ""}', "reflection")).toBe(false);
  });

  it("décode tabulation, retour chariot et guillemets échappés", () => {
    const raw = '{"reflection": "a\\tb\\rc\\"d"}';
    expect(extractPartialJsonString(raw, "reflection")).toBe('a\tb\rc"d');
  });
});
