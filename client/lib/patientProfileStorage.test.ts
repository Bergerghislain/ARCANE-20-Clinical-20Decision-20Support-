import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPatientProfileDraft,
  loadPatientProfileDraft,
  savePatientProfileDraft,
} from "@/lib/patientProfileStorage";

describe("lib/patientProfileStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T10:00:00.000Z"));
  });

  it("savePatientProfileDraft normalise schemaVersion/patientId et persiste", () => {
    const saved = savePatientProfileDraft("12", {
      schemaVersion: 2 as any,
      patientId: "999",
      diagnosis: "Dx",
      pathologySummary: "Sum",
      analyses: [],
      report: { conclusion: "c", reasoning: "r", sources: ["s"] },
    });
    expect(saved.savedAt).toBe("2026-03-17T10:00:00.000Z");
    expect(saved.profile.schemaVersion).toBe(1);
    expect(saved.profile.patientId).toBe("12");
    expect(localStorage.getItem("arcane_patient_profile_v1:12")).toBeTruthy();
  });

  it("loadPatientProfileDraft retourne null si absent ou invalide", () => {
    expect(loadPatientProfileDraft("1")).toBeNull();
    localStorage.setItem("arcane_patient_profile_v1:1", "{broken");
    expect(loadPatientProfileDraft("1")).toBeNull();
  });

  it("clearPatientProfileDraft supprime la clé", () => {
    localStorage.setItem("arcane_patient_profile_v1:1", "{}");
    clearPatientProfileDraft("1");
    expect(localStorage.getItem("arcane_patient_profile_v1:1")).toBeNull();
  });
});

