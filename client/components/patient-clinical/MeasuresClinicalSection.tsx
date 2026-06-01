import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMeasure } from "@/lib/patientClinicalApi";
import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import { ClinicalDataTable } from "./ClinicalDataTable";
import { ClinicalSectionShell } from "./ClinicalSectionShell";
import { formatMonthYear, formatValue } from "./clinicalFormatters";

interface MeasuresClinicalSectionProps {
  bundle: PatientClinicalBundle | null;
  patientId?: string;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function MeasuresClinicalSection({
  bundle,
  patientId,
  onRefresh,
  isLoading,
  error,
}: MeasuresClinicalSectionProps) {
  const rows = bundle?.mesureList ?? [];
  const [measureType, setMeasureType] = useState("WEIGHT");
  const [measureValue, setMeasureValue] = useState("");
  const [measureUnit, setMeasureUnit] = useState("kg");
  const [measureDateYear, setMeasureDateYear] = useState("");
  const [measureDateMonth, setMeasureDateMonth] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!patientId || !onRefresh) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await createMeasure(patientId, {
        measureType,
        measureUnit,
        measureValue: measureValue ? Number(measureValue) : null,
        measureDateYear: measureDateYear ? Number(measureDateYear) : null,
        measureDateMonth: measureDateMonth ? Number(measureDateMonth) : null,
      });
      await onRefresh();
      setMeasureValue("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ClinicalSectionShell
      title="Mesures biologiques et anthropométriques"
      description="Taille, poids et autres mesures (table measures)."
      isLoading={isLoading}
      error={error}
      sourceHint="Données issues de GET /api/patients/{id}/clinical"
    >
      {patientId && onRefresh ? (
        <div className="mb-4 grid gap-3 rounded-lg border border-border/80 bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1">
            <Label htmlFor="measure-type">Type</Label>
            <Select value={measureType} onValueChange={setMeasureType}>
              <SelectTrigger id="measure-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HEIGHT">HEIGHT</SelectItem>
                <SelectItem value="WEIGHT">WEIGHT</SelectItem>
                <SelectItem value="BMI">BMI</SelectItem>
                <SelectItem value="OTHER">OTHER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="measure-value">Valeur</Label>
            <Input
              id="measure-value"
              type="number"
              value={measureValue}
              onChange={(event) => setMeasureValue(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="measure-unit">Unité</Label>
            <Input
              id="measure-unit"
              value={measureUnit}
              onChange={(event) => setMeasureUnit(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="measure-year">Année</Label>
            <Input
              id="measure-year"
              type="number"
              value={measureDateYear}
              onChange={(event) => setMeasureDateYear(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="measure-month">Mois</Label>
            <Input
              id="measure-month"
              type="number"
              min={1}
              max={12}
              value={measureDateMonth}
              onChange={(event) => setMeasureDateMonth(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" disabled={isSaving} onClick={() => void handleCreate()}>
              {isSaving ? "Enregistrement…" : "Ajouter"}
            </Button>
          </div>
          {formError ? (
            <p className="text-sm text-destructive sm:col-span-2 lg:col-span-6">{formError}</p>
          ) : null}
        </div>
      ) : null}

      <ClinicalDataTable
        rows={rows}
        emptyLabel="Aucune mesure enregistrée."
        rowKey={(row, index) => {
          const item = row as Record<string, unknown>;
          return `${item.measureType}-${item.measureDateYear}-${item.measureDateMonth}-${index}`;
        }}
        columns={[
          {
            key: "type",
            header: "Type",
            render: (row) => formatValue((row as Record<string, unknown>).measureType),
          },
          {
            key: "value",
            header: "Valeur",
            render: (row) => formatValue((row as Record<string, unknown>).measureValue),
          },
          {
            key: "unit",
            header: "Unité",
            render: (row) => formatValue((row as Record<string, unknown>).measureUnit),
          },
          {
            key: "date",
            header: "Date",
            render: (row) => {
              const item = row as Record<string, unknown>;
              return formatMonthYear(
                item.measureDateYear as number | null,
                item.measureDateMonth as number | null,
              );
            },
          },
        ]}
      />
    </ClinicalSectionShell>
  );
}
