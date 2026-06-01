import { useState } from "react";
import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClinicalDataTable } from "./ClinicalDataTable";
import { ClinicalSectionShell } from "./ClinicalSectionShell";
import { formatMonthYear, formatValue } from "./clinicalFormatters";

interface PrimaryCancerClinicalSectionProps {
  bundle: PatientClinicalBundle | null;
  isLoading?: boolean;
  error?: string | null;
}

export function PrimaryCancerClinicalSection({
  bundle,
  isLoading,
  error,
}: PrimaryCancerClinicalSectionProps) {
  const cancers = bundle?.primaryCancer ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeIndex = selectedIndex < cancers.length ? selectedIndex : 0;
  const cancer = cancers[safeIndex] as Record<string, unknown> | undefined;

  const tnmEvents = Array.isArray(cancer?.tnmEvent)
    ? (cancer.tnmEvent as Record<string, unknown>[])
    : [];
  const tumorSizes = Array.isArray(cancer?.tumorSize)
    ? (cancer.tumorSize as Record<string, unknown>[])
    : [];
  const imaging = Array.isArray(cancer?.imaging)
    ? (cancer.imaging as Record<string, unknown>[])
    : [];
  const radiotherapy = Array.isArray(cancer?.radiotherapy)
    ? (cancer.radiotherapy as Record<string, unknown>[])
    : [];

  return (
    <ClinicalSectionShell
      title="Cancers primitifs (TNM, imagerie, radiothérapie)"
      description="Sélectionnez un cancer pour voir le détail. Imagerie et radiothérapie globales patient sont rattachées au premier cancer (limite actuelle du modèle SQL)."
      isLoading={isLoading}
      error={error}
    >
      {cancers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun cancer primitif.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {cancers.map((item, index) => {
              const row = item as Record<string, unknown>;
              const label = `${formatValue(row.topographyCode)} · ${formatValue(row.morphologyCode)}`;
              return (
                <Button
                  key={`cancer-tab-${index}`}
                  type="button"
                  size="sm"
                  variant={safeIndex === index ? "default" : "outline"}
                  onClick={() => setSelectedIndex(index)}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          {cancer ? (
            <div className="space-y-4 rounded-xl border border-violet-200/50 bg-violet-50/30 p-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge>{formatValue(cancer.topographyCode)}</Badge>
                <Badge variant="secondary">{formatValue(cancer.morphologyCode)}</Badge>
                <span className="text-muted-foreground">
                  Diagnostic :{" "}
                  {formatMonthYear(
                    cancer.cancerDiagnosisDateYear as number | null,
                    cancer.cancerDiagnosisDateMonth as number | null,
                  )}
                </span>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">TNM</h4>
                <ClinicalDataTable
                  rows={tnmEvents}
                  emptyLabel="Aucun événement TNM."
                  rowKey={(_, index) => `tnm-${safeIndex}-${index}`}
                  columns={[
                    { key: "ver", header: "Version", render: (r) => formatValue(r.tnmVersion) },
                    { key: "t", header: "T", render: (r) => formatValue(r.tCategory) },
                    { key: "n", header: "N", render: (r) => formatValue(r.nCategory) },
                    { key: "m", header: "M", render: (r) => formatValue(r.mCategory) },
                    {
                      key: "date",
                      header: "Date",
                      render: (r) =>
                        formatMonthYear(
                          r.eventDateYear as number | null,
                          r.eventDateMonth as number | null,
                        ),
                    },
                  ]}
                />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Tailles tumorales</h4>
                <ClinicalDataTable
                  rows={tumorSizes}
                  emptyLabel="Aucune mesure de taille."
                  rowKey={(_, index) => `size-${safeIndex}-${index}`}
                  columns={[
                    {
                      key: "value",
                      header: "Taille",
                      render: (r) => `${formatValue(r.sizeValue)} ${formatValue(r.sizeUnit)}`,
                    },
                    {
                      key: "method",
                      header: "Méthode",
                      render: (r) => formatValue(r.measurementMethod),
                    },
                    {
                      key: "date",
                      header: "Date",
                      render: (r) =>
                        formatMonthYear(
                          r.measurementDateYear as number | null,
                          r.measurementDateMonth as number | null,
                        ),
                    },
                  ]}
                />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Imagerie</h4>
                <ClinicalDataTable
                  rows={imaging}
                  emptyLabel="Aucune étude d'imagerie."
                  rowKey={(_, index) => `img-${safeIndex}-${index}`}
                  columns={[
                    { key: "type", header: "Type", render: (r) => formatValue(r.studyType) },
                    {
                      key: "date",
                      header: "Date",
                      render: (r) =>
                        formatMonthYear(
                          r.studyDateYear as number | null,
                          r.studyDateMonth as number | null,
                        ),
                    },
                    { key: "body", header: "Région", render: (r) => formatValue(r.bodyPart) },
                    { key: "findings", header: "Résultat", render: (r) => formatValue(r.findings) },
                  ]}
                />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Radiothérapie</h4>
                <ClinicalDataTable
                  rows={radiotherapy}
                  emptyLabel="Aucune radiothérapie."
                  rowKey={(_, index) => `radio-${safeIndex}-${index}`}
                  columns={[
                    { key: "mod", header: "Modalité", render: (r) => formatValue(r.modality) },
                    {
                      key: "dose",
                      header: "Dose",
                      render: (r) =>
                        `${formatValue(r.totalDose)} ${formatValue(r.doseUnit)}`.trim(),
                    },
                    {
                      key: "start",
                      header: "Début",
                      render: (r) =>
                        formatMonthYear(
                          r.startDateYear as number | null,
                          r.startDateMonth as number | null,
                        ),
                    },
                    { key: "site", header: "Cible", render: (r) => formatValue(r.targetSite) },
                  ]}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ClinicalSectionShell>
  );
}
