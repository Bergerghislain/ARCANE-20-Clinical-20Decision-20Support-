import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PatientFile from "@/pages/PatientFile";
import { apiFetch } from "@/lib/api";
import {
  loadPatientReportProfile,
  normalizePatientReportProfile,
  PatientReportProfile,
} from "@/lib/patientReport";
import {
  fetchPatientProfileFromApi,
  savePatientProfileToApi,
} from "@/lib/patientProfileApi";
import {
  clearPatientProfileDraft,
  loadPatientProfileDraft,
  savePatientProfileDraft,
} from "@/lib/patientProfileStorage";

const navigateMock = vi.fn();

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useParams: () => ({ patientId: "1" }),
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/patientReport", async () => {
  const actual = await vi.importActual<typeof import("@/lib/patientReport")>(
    "@/lib/patientReport",
  );
  return {
    ...actual,
    loadPatientReportProfile: vi.fn(),
    normalizePatientReportProfile: vi.fn(actual.normalizePatientReportProfile),
  };
});

vi.mock("@/lib/patientProfileApi", () => ({
  fetchPatientProfileFromApi: vi.fn(),
  savePatientProfileToApi: vi.fn(),
}));

vi.mock("@/lib/patientProfileStorage", () => ({
  savePatientProfileDraft: vi.fn(),
  loadPatientProfileDraft: vi.fn(),
  clearPatientProfileDraft: vi.fn(),
}));

function makeProfile(
  diagnosis: string,
  sourceSuffix: string,
): PatientReportProfile {
  return {
    schemaVersion: 1,
    patientId: "1",
    diagnosis,
    pathologySummary: `Resume ${sourceSuffix}`,
    analyses: [{ name: "CRP", value: "18", unit: "mg/L" }],
    report: {
      conclusion: `Conclusion ${sourceSuffix}`,
      reasoning: `Raisonnement ${sourceSuffix}`,
      sources: [`Source ${sourceSuffix}`],
    },
  };
}

const patientApiResponse = {
  ok: true,
  json: async () => ({
    id_patient: 1,
    name: "Marie Dubois",
    ipp: "MRN-001",
    condition: "Lymphome rare",
    status: "active",
    sex: "FEMALE",
    birth_date_year: 1980,
    birth_date_month: 5,
    birth_date_day: 2,
    last_visit_date_year: 2026,
    last_visit_date_month: 3,
  }),
} as Response;

describe("PatientFile flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiFetch).mockResolvedValue(patientApiResponse);
    vi.mocked(loadPatientReportProfile).mockResolvedValue(null);
    vi.mocked(fetchPatientProfileFromApi).mockResolvedValue(null);
    vi.mocked(savePatientProfileToApi).mockResolvedValue(null);
    vi.mocked(loadPatientProfileDraft).mockReturnValue(null);
    vi.mocked(savePatientProfileDraft).mockReturnValue({
      schemaVersion: 1,
      savedAt: "2026-03-17T10:00:00.000Z",
      profile: makeProfile("Draft", "draft"),
    });
  });

  it("priorise le draft local sur JSON puis API", async () => {
    vi.mocked(loadPatientReportProfile).mockResolvedValue(
      makeProfile("Diagnostic JSON", "json"),
    );
    vi.mocked(fetchPatientProfileFromApi).mockResolvedValue(
      makeProfile("Diagnostic API", "api"),
    );
    vi.mocked(loadPatientProfileDraft).mockReturnValue({
      schemaVersion: 1,
      savedAt: "2026-03-17T12:00:00.000Z",
      profile: makeProfile("Diagnostic local", "local"),
    });

    render(<PatientFile />);

    const diagnosisInput = (await screen.findByLabelText(
      "Pathologie principale",
    )) as HTMLInputElement;

    await waitFor(() => {
      expect(diagnosisInput.value).toBe("Diagnostic local");
    });
    expect(
      screen.getByText(/Profil patient charge depuis localStorage\./i),
    ).toBeInTheDocument();
  });

  it("genere un report depuis l'onglet Patient Infos", async () => {
    const user = userEvent.setup();
    render(<PatientFile />);

    await screen.findByLabelText("Pathologie principale");
    await user.click(
      screen.getByRole("button", {
        name: /Generate Report/i,
      }),
    );

    expect(await screen.findByText("Conclusion IA")).toBeInTheDocument();
    expect(screen.getByText("Raisonnement")).toBeInTheDocument();
  });

  it("transfere le contexte patient vers ARGOS avec navigation", async () => {
    const user = userEvent.setup();
    render(<PatientFile />);

    await screen.findByLabelText("Pathologie principale");
    await user.click(
      screen.getByRole("button", { name: /Envoyer le contexte vers ARGOS/i }),
    );

    expect(navigateMock).toHaveBeenCalled();
    const lastCall = navigateMock.mock.calls[navigateMock.mock.calls.length - 1];
    expect(lastCall[0]).toBe("/argos");
    expect(lastCall[1]).toMatchObject({
      state: {
        patient: {
          id: "1",
          name: "Marie Dubois",
          contextProfile: expect.objectContaining({
            patientId: "1",
          }),
          contextMessage: expect.stringContaining(
            "Contexte patient auto-charge",
          ),
        },
      },
    });
  });

  it("affiche une erreur si import JSON invalide", async () => {
    const user = userEvent.setup();
    const { container } = render(<PatientFile />);

    await screen.findByLabelText("Pathologie principale");
    vi.mocked(normalizePatientReportProfile).mockReturnValueOnce(null);

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([JSON.stringify({ broken: true })], "invalid.json", {
      type: "application/json",
    });

    await user.upload(fileInput, file);

    expect(
      await screen.findByText(
        /Le JSON est invalide\. Verifiez patientId, pathology, analyses et report\./i,
      ),
    ).toBeInTheDocument();
  });

  it("efface le draft local via le bouton dedie", async () => {
    const user = userEvent.setup();
    render(<PatientFile />);

    await screen.findByLabelText("Pathologie principale");
    await user.click(screen.getByRole("button", { name: /Effacer draft local/i }));

    expect(clearPatientProfileDraft).toHaveBeenCalledWith("1");
    expect(screen.getByText(/Draft local efface\./i)).toBeInTheDocument();
  });
});

