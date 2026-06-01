import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MeasuresClinicalSection } from "./MeasuresClinicalSection";

vi.mock("@/lib/patientClinicalApi", () => ({
  createMeasure: vi.fn(),
}));

const sampleBundle = {
  ipp: "IPP-1",
  birthDateYear: null,
  birthDateMonth: null,
  sex: "MALE" as const,
  deathDateYear: null,
  deathDateMonth: null,
  lastVisitDateYear: null,
  lastVisitDateMonth: null,
  lastNewsDateYear: null,
  lastNewsDateMonth: null,
  mesureList: [
    {
      measureType: "WEIGHT",
      measureValue: 72,
      measureUnit: "kg",
      measureDateYear: 2024,
      measureDateMonth: 3,
    },
  ],
  medication: [],
  surgery: [],
  primaryCancer: [],
  biologicalSpecimenList: [],
};

describe("MeasuresClinicalSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche les mesures du bundle", () => {
    render(<MeasuresClinicalSection bundle={sampleBundle} />);

    expect(screen.getByText("WEIGHT")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
  });

  it("permet d'ajouter une mesure via l'API", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { createMeasure } = await import("@/lib/patientClinicalApi");
    vi.mocked(createMeasure).mockResolvedValue({ id: 1 });

    render(
      <MeasuresClinicalSection
        bundle={sampleBundle}
        patientId="42"
        onRefresh={onRefresh}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(createMeasure).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({
        measureType: "WEIGHT",
        measureUnit: "kg",
      }),
    );
    expect(onRefresh).toHaveBeenCalled();
  });
});
