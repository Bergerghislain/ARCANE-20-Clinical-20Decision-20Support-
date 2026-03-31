import { describe, expect, it, vi, afterEach } from "vitest";
import {
  analysesToEditorText,
  buildArgosContextFromProfile,
  buildSimulatedAiReport,
  loadPatientReportProfile,
  normalizePatientReportProfile,
  parseAnalysesFromEditorText,
} from "@/lib/patientReport";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("patientReport utils", () => {
  it("normalise un profil heterogene et applique les valeurs par defaut", () => {
    const raw = {
      patient_id: "42",
      condition: "Lymphome rare",
      pathology: { summary: "Atteinte ganglionnaire diffuse" },
      analyses: [{ test: "CRP", result: "18", unit: "mg/L" }],
      ia_report: {
        conclusion: "Conclusion simulee",
        reasoning: "Raisonnement simule",
        references: ["Source A"],
      },
    };

    const normalized = normalizePatientReportProfile(raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.schemaVersion).toBe(1);
    expect(normalized?.patientId).toBe("42");
    expect(normalized?.diagnosis).toBe("Lymphome rare");
    expect(normalized?.analyses[0]).toMatchObject({
      name: "CRP",
      value: "18",
      unit: "mg/L",
    });
    expect(normalized?.report.sources).toEqual(["Source A"]);
  });

  it("normalise un JSON patient detaille type import backend", () => {
    const raw = {
      ipp: "arcane1",
      birthDateYear: 1962,
      birthDateMonth: 1,
      sex: "MALE",
      primaryCancer: [
        {
          topographyCode: "C42.2",
          morphologyCode: "8000/3",
          cancerDiagnosisDateYear: 2002,
          cancerDiagnosisDateMonth: 7,
        },
      ],
      biologicalSpecimenList: [
        {
          specimenIdentifier: "15H10881",
          specimenCollectDateYear: 2015,
          specimenCollectDateMonth: 11,
        },
      ],
      mesureList: [
        {
          measureType: "HEIGHT",
          measureValue: 167.0,
          measureUnit: "CM",
          measureDateYear: 2010,
          measureDateMonth: 3,
        },
      ],
      report: {
        conclusion: "Conclusion clinique test",
        reasoning: "Raisonnement clinique test",
        sources: ["Source test"],
      },
    };

    const normalized = normalizePatientReportProfile(raw, "1");
    expect(normalized).not.toBeNull();
    expect(normalized?.patientId).toBe("arcane1");
    expect(normalized?.clinicalData?.ipp).toBe("arcane1");
    expect(normalized?.clinicalData?.primaryCancer.length).toBe(1);
    expect(normalized?.clinicalData?.biologicalSpecimenList.length).toBe(1);
    expect(normalized?.analyses.length).toBeGreaterThan(0);
    expect(normalized?.diagnosis).toContain("Cancer primaire");
  });

  it("retourne null sans patientId ni fallback", () => {
    const normalized = normalizePatientReportProfile({
      diagnosis: "Sans identifiant",
    });
    expect(normalized).toBeNull();
  });

  it("fait un roundtrip analyses <-> textarea", () => {
    const input = [
      {
        name: "LDH",
        value: "512",
        unit: "U/L",
        referenceRange: "125-220",
        date: "2026-03-10",
      },
      {
        name: "CRP",
        value: "18",
      },
    ];

    const text = analysesToEditorText(input);
    const output = parseAnalysesFromEditorText(text);

    expect(output[0]).toMatchObject({
      name: "LDH",
      value: "512",
      unit: "U/L",
      referenceRange: "125-220",
      date: "2026-03-10",
    });
    expect(output[1]).toMatchObject({
      name: "CRP",
      value: "18",
    });
  });

  it("genere un rapport IA simule exploitable", () => {
    const report = buildSimulatedAiReport({
      patientName: "Marie Dubois",
      diagnosis: "Lymphome",
      pathologySummary: "Contexte clinique test",
      analyses: [{ name: "CRP", value: "18", unit: "mg/L" }],
    });

    expect(report.conclusion).toContain("Marie Dubois");
    expect(report.conclusion).toContain("Lymphome");
    expect(report.reasoning).toContain("Contexte clinique test");
    expect(report.sources.length).toBeGreaterThan(0);
  });

  it("construit le contexte ARGOS avec les sections attendues", () => {
    const context = buildArgosContextFromProfile(
      {
        schemaVersion: 1,
        patientId: "7",
        diagnosis: "Sarcome",
        pathologySummary: "Resume test",
        analyses: [{ name: "Hb", value: "10.8", unit: "g/dL" }],
        report: {
          conclusion: "Conclusion test",
          reasoning: "Raisonnement test",
          sources: ["Guide test"],
        },
      },
      "Jean Martin",
      "MRN-123",
    );

    expect(context).toContain("Contexte patient auto-charge");
    expect(context).toContain("Jean Martin (MRN-123)");
    expect(context).toContain("Diagnostic: Sarcome");
    expect(context).toContain("Conclusion test");
  });

  it("charge un profil depuis le JSON statique", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        patientId: "3",
        diagnosis: "Neuroendocrine Tumor",
        pathologySummary: "Test",
        analyses: [],
        report: {
          conclusion: "C",
          reasoning: "R",
          sources: ["S"],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await loadPatientReportProfile("3");

    expect(fetchMock).toHaveBeenCalledWith("/patient-reports/3.json");
    expect(profile?.patientId).toBe("3");
    expect(profile?.schemaVersion).toBe(1);
  });
});

