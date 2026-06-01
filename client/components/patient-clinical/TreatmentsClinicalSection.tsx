import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import { ClinicalDataTable } from "./ClinicalDataTable";
import { ClinicalSectionShell } from "./ClinicalSectionShell";
import { formatMonthYear, formatValue } from "./clinicalFormatters";

interface TreatmentsClinicalSectionProps {
  bundle: PatientClinicalBundle | null;
  isLoading?: boolean;
  error?: string | null;
}

export function TreatmentsClinicalSection({
  bundle,
  isLoading,
  error,
}: TreatmentsClinicalSectionProps) {
  const medications = bundle?.medication ?? [];
  const surgeries = bundle?.surgery ?? [];

  return (
    <div className="space-y-4">
      <ClinicalSectionShell
        title="Traitements (médicaments)"
        isLoading={isLoading}
        error={error}
      >
        <ClinicalDataTable
          rows={medications}
          emptyLabel="Aucun traitement médicamenteux."
          rowKey={(row, index) => `med-${row.medicationName}-${index}`}
          columns={[
            {
              key: "name",
              header: "Médicament",
              render: (row) => formatValue((row as Record<string, unknown>).medicationName),
            },
            {
              key: "dosage",
              header: "Dosage",
              render: (row) => formatValue((row as Record<string, unknown>).dosage),
            },
            {
              key: "frequency",
              header: "Fréquence",
              render: (row) => formatValue((row as Record<string, unknown>).frequency),
            },
            {
              key: "start",
              header: "Début",
              render: (row) => {
                const item = row as Record<string, unknown>;
                return formatMonthYear(
                  item.startDateYear as number | null,
                  item.startDateMonth as number | null,
                );
              },
            },
          ]}
        />
      </ClinicalSectionShell>

      <ClinicalSectionShell title="Chirurgies (niveau patient)">
        <ClinicalDataTable
          rows={surgeries}
          emptyLabel="Aucune chirurgie au niveau patient."
          rowKey={(row, index) => `surg-${index}`}
          columns={[
            {
              key: "type",
              header: "Type",
              render: (row) => formatValue((row as Record<string, unknown>).surgeryType),
            },
            {
              key: "topo",
              header: "Topographie",
              render: (row) => formatValue((row as Record<string, unknown>).topographyCode),
            },
            {
              key: "date",
              header: "Date",
              render: (row) => {
                const item = row as Record<string, unknown>;
                return formatMonthYear(
                  item.surgeryDateYear as number | null,
                  item.surgeryDateMonth as number | null,
                );
              },
            },
          ]}
        />
      </ClinicalSectionShell>
    </div>
  );
}
