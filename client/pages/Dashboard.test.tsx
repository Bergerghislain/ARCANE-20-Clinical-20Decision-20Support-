import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "@/pages/Dashboard";
import { apiFetch } from "@/lib/api";

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
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

const FIRST_PAGE_PATH = "/api/patients?limit=24&offset=0";
const SECOND_PAGE_PATH = "/api/patients?limit=24&offset=24";

const basePatients = [
  {
    id_patient: 1,
    name: "Marie Dubois",
    ipp: "MRN-001",
    condition: "Lymphome rare",
    birth_date_year: 1980,
    status: "active",
  },
  {
    id_patient: 2,
    name: "Jean Martin",
    ipp: "MRN-002",
    condition: "Sarcome mandibulaire",
    birth_date_year: 1975,
    status: "pending",
  },
  {
    id_patient: 3,
    name: "Sophie Bernard",
    ipp: "MRN-003",
    condition: "Tumeur neuroendocrine",
    birth_date_year: 1990,
    status: "completed",
  },
];

describe("Dashboard flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === FIRST_PAGE_PATH) {
        return jsonResponse(basePatients);
      }
      if (typeof path === "string" && path.startsWith("/api/patients?")) {
        return jsonResponse([]);
      }
      return jsonResponse({}, false);
    });
  });

  it("charge les patients et affiche la liste", async () => {
    renderDashboard();

    expect(await screen.findByText("Marie Dubois")).toBeInTheDocument();
    expect(screen.getByText("Jean Martin")).toBeInTheDocument();
    expect(screen.getByText("Sophie Bernard")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(FIRST_PAGE_PATH);
  });

  it("filtre par recherche puis par statut", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Marie Dubois");

    await user.type(
      screen.getByPlaceholderText(/Search by patient name or condition/i),
      "sarcome",
    );
    expect(screen.getByText("Jean Martin")).toBeInTheDocument();
    expect(screen.queryByText("Marie Dubois")).not.toBeInTheDocument();

    await user.clear(
      screen.getByPlaceholderText(/Search by patient name or condition/i),
    );
    await user.click(screen.getByRole("button", { name: "Pending" }));

    expect(screen.getByText("Jean Martin")).toBeInTheDocument();
    expect(screen.queryByText("Sophie Bernard")).not.toBeInTheDocument();
  });

  it("declenche les navigations globales", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Marie Dubois");
    await user.click(screen.getByRole("button", { name: "Add Patient" }));
    await user.click(screen.getByRole("button", { name: "Open ARGOS" }));

    expect(navigateMock).toHaveBeenCalledWith("/add-patient");
    expect(navigateMock).toHaveBeenCalledWith("/argos");
  });

  it("ouvre le dossier patient depuis la carte", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Marie Dubois");
    await user.click(screen.getAllByRole("button", { name: /^Open$/i })[0]);

    expect(navigateMock).toHaveBeenCalledWith("/patient/1");
  });

  it("ouvre ARGOS contextualise depuis une carte patient", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Marie Dubois");
    await user.click(
      screen.getByRole("button", {
        name: "Open ARGOS for Marie Dubois",
      }),
    );

    expect(navigateMock).toHaveBeenCalledWith(
      "/argos",
      expect.objectContaining({
        state: {
          patient: expect.objectContaining({
            id: "1",
            name: "Marie Dubois",
            mrn: "MRN-001",
          }),
        },
      }),
    );
  });

  it("importe un JSON et recharge la liste", async () => {
    const user = userEvent.setup();
    let patientsFetchCount = 0;

    vi.mocked(apiFetch).mockImplementation(async (path, init) => {
      if (path === FIRST_PAGE_PATH) {
        patientsFetchCount += 1;
        if (patientsFetchCount === 1) {
          return jsonResponse(basePatients.slice(0, 1));
        }
        return jsonResponse([
          ...basePatients.slice(0, 1),
          {
            id_patient: 99,
            name: "Nouveau Patient",
            ipp: "MRN-099",
            condition: "Cas importe",
            status: "active",
          },
        ]);
      }
      if (typeof path === "string" && path.startsWith("/api/patients?")) {
        return jsonResponse([]);
      }
      if (path === "/api/patients/import") {
        expect(init).toMatchObject({
          method: "POST",
        });
        return jsonResponse({ id: 99 }, true);
      }
      return jsonResponse({}, false);
    });

    const { container } = renderDashboard();
    await screen.findByText("Marie Dubois");

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([JSON.stringify({ ipp: "MRN-099" })], "patient.json", {
      type: "application/json",
    });

    await user.upload(fileInput, file);

    expect(await screen.findByText("Nouveau Patient")).toBeInTheDocument();
    await waitFor(() => {
      const importCall = vi
        .mocked(apiFetch)
        .mock.calls.find(([path]) => path === "/api/patients/import");
      expect(importCall).toBeTruthy();
    });
  });

  it("affiche une erreur si l'import API echoue", async () => {
    const user = userEvent.setup();

    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === FIRST_PAGE_PATH) {
        return jsonResponse(basePatients.slice(0, 1));
      }
      if (typeof path === "string" && path.startsWith("/api/patients?")) {
        return jsonResponse([]);
      }
      if (path === "/api/patients/import") {
        return jsonResponse({ error: "Payload invalide" }, false);
      }
      return jsonResponse({}, false);
    });

    const { container } = renderDashboard();
    await screen.findByText("Marie Dubois");

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([JSON.stringify({ invalid: true })], "broken.json", {
      type: "application/json",
    });

    await user.upload(fileInput, file);

    expect(await screen.findByText(/Payload invalide/i)).toBeInTheDocument();
  });

  it("charge une page supplementaire quand on clique sur Load more", async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 24 }, (_, index) => ({
      id_patient: index + 1,
      name: `Patient ${index + 1}`,
      ipp: `MRN-${String(index + 1).padStart(3, "0")}`,
      condition: "Condition test",
      birth_date_year: 1980,
      status: "active",
    }));
    const secondPage = [
      {
        id_patient: 25,
        name: "Patient 25",
        ipp: "MRN-025",
        condition: "Condition test",
        birth_date_year: 1982,
        status: "pending",
      },
    ];

    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === FIRST_PAGE_PATH) return jsonResponse(firstPage);
      if (path === SECOND_PAGE_PATH) return jsonResponse(secondPage);
      if (typeof path === "string" && path.startsWith("/api/patients?")) {
        return jsonResponse([]);
      }
      return jsonResponse({}, false);
    });

    renderDashboard();
    expect(await screen.findByText("Patient 1")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Load more patients/i }),
    );

    expect(await screen.findByText("Patient 25")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(SECOND_PAGE_PATH);
  });
});

