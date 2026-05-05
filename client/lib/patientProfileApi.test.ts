import { describe, expect, it, vi } from "vitest";

import { fetchPatientProfileFromApi, savePatientProfileToApi } from "@/lib/patientProfileApi";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/patientReport", () => ({
  normalizePatientReportProfile: vi.fn(),
}));

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

describe("lib/patientProfileApi", () => {
  it("fetchPatientProfileFromApi throw si HTTP !ok", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(jsonResponse({}, false));
    await expect(fetchPatientProfileFromApi("1")).rejects.toThrow(/Impossible de charger/i);
  });

  it("fetchPatientProfileFromApi retourne null si payload.profile null", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(
      jsonResponse({ patient_id: 1, source: "x", profile: null }),
    );
    await expect(fetchPatientProfileFromApi("1")).resolves.toBeNull();
  });

  it("savePatientProfileToApi appelle normalize avec meta (profileVersion/schemaVersion)", async () => {
    const { apiFetch } = await import("@/lib/api");
    const { normalizePatientReportProfile } = await import("@/lib/patientReport");

    vi.mocked(apiFetch).mockResolvedValueOnce(
      jsonResponse({
        patient_id: 1,
        source: "persisted",
        profile: { schemaVersion: 1, diagnosis: "Dx", pathologySummary: "S", analyses: [], report: { conclusion: "c", reasoning: "r", sources: ["s"] } },
        profile_version: 3,
        stored_schema_version: 2,
      }),
    );

    vi.mocked(normalizePatientReportProfile).mockReturnValueOnce({ schemaVersion: 2 } as any);

    const out = await savePatientProfileToApi("1", {
      schemaVersion: 1,
      patientId: "1",
      diagnosis: "Dx",
      pathologySummary: "S",
      analyses: [],
      report: { conclusion: "c", reasoning: "r", sources: ["s"] },
    } as any);

    expect(normalizePatientReportProfile).toHaveBeenCalledWith(
      expect.objectContaining({ profileVersion: 3, schemaVersion: 2 }),
      "1",
    );
    expect(out).toEqual({ schemaVersion: 2 });
  });
});

