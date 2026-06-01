import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import { Badge } from "@/components/ui/badge";
import { ClinicalDataTable } from "./ClinicalDataTable";
import { ClinicalSectionShell } from "./ClinicalSectionShell";
import { formatMonthYear, formatValue } from "./clinicalFormatters";

interface SpecimensClinicalSectionProps {
  bundle: PatientClinicalBundle | null;
  isLoading?: boolean;
  error?: string | null;
}

export function SpecimensClinicalSection({
  bundle,
  isLoading,
  error,
}: SpecimensClinicalSectionProps) {
  const specimens = bundle?.biologicalSpecimenList ?? [];

  return (
    <ClinicalSectionShell
      title="Prélèvements biologiques et biomarqueurs"
      description="Liste des specimens ; développez les biomarqueurs par prélèvement."
      isLoading={isLoading}
      error={error}
    >
      <div className="space-y-4">
        {specimens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun prélèvement.</p>
        ) : (
          specimens.map((specimen, index) => {
            const row = specimen as Record<string, unknown>;
            const biomarkers = Array.isArray(row.biomarker)
              ? (row.biomarker as Record<string, unknown>[])
              : [];
            return (
              <div
                key={`${row.specimenIdentifier}-${index}`}
                className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {formatValue(row.specimenIdentifier)}
                  </span>
                  <Badge variant="secondary">{formatValue(row.specimenType)}</Badge>
                  <Badge variant="outline">{formatValue(row.specimenNature)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatMonthYear(
                      row.specimenCollectDateYear as number | null,
                      row.specimenCollectDateMonth as number | null,
                    )}{" "}
                    · {formatValue(row.specimenTopographyCode)}
                  </span>
                </div>
                <ClinicalDataTable
                  rows={biomarkers}
                  emptyLabel="Aucun biomarqueur pour ce prélèvement."
                  rowKey={(_, bioIndex) => `bio-${index}-${bioIndex}`}
                  columns={[
                    {
                      key: "name",
                      header: "Biomarqueur",
                      render: (bio) => formatValue(bio.biomarkerName),
                    },
                    {
                      key: "value",
                      header: "Valeur",
                      render: (bio) => formatValue(bio.biomarkerValue),
                    },
                    {
                      key: "unit",
                      header: "Unité",
                      render: (bio) => formatValue(bio.biomarkerUnit),
                    },
                    {
                      key: "date",
                      header: "Date test",
                      render: (bio) =>
                        formatMonthYear(
                          bio.testDateYear as number | null,
                          bio.testDateMonth as number | null,
                        ),
                    },
                  ]}
                />
              </div>
            );
          })
        )}
      </div>
    </ClinicalSectionShell>
  );
}
