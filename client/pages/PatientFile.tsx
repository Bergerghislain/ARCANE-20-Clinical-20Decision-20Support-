import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User } from "lucide-react";

interface PatientRecord {
  id_patient?: number;
  id?: number;
  name?: string | null;
  ipp?: string | null;
  birth_date_year?: number | null;
  birth_date_month?: number | null;
  birth_date_day?: number | null;
  sex?: string | null;
  condition?: string | null;
  status?: "pending" | "active" | "completed" | null;
  health_info?: {
    heightCm?: number | null;
    weightKg?: number | null;
    comorbidities?: string | null;
    notes?: string | null;
  } | null;
}

const toDateInputValue = (patient: PatientRecord) => {
  if (!patient.birth_date_year) return "";
  const month = String(patient.birth_date_month || 1).padStart(2, "0");
  const day = String(patient.birth_date_day || 1).padStart(2, "0");
  return `${patient.birth_date_year}-${month}-${day}`;
};

export default function PatientFile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    ipp: "",
    birthDate: "",
    sex: "",
    condition: "",
    status: "pending",
    heightCm: "",
    weightKg: "",
    comorbidities: "",
    notes: "",
  });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}`);
        if (!res.ok) {
          throw new Error("Failed to load patient");
        }
        const data = (await res.json()) as PatientRecord;
        setPatient(data);
        setForm({
          name: data.name || "",
          ipp: data.ipp || "",
          birthDate: toDateInputValue(data),
          sex: data.sex || "",
          condition: data.condition || "",
          status: data.status || "pending",
          heightCm:
            data.health_info?.heightCm !== null &&
            data.health_info?.heightCm !== undefined
              ? String(data.health_info.heightCm)
              : "",
          weightKg:
            data.health_info?.weightKg !== null &&
            data.health_info?.weightKg !== undefined
              ? String(data.health_info.weightKg)
              : "",
          comorbidities: data.health_info?.comorbidities || "",
          notes: data.health_info?.notes || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  const handleSave = async () => {
    if (!patientId) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim() || null,
        ipp: form.ipp.trim() || null,
        birthDate: form.birthDate || null,
        gender: form.sex.trim() || null,
        condition: form.condition.trim() || null,
        status: form.status,
        healthInfo: {
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          comorbidities: form.comorbidities.trim() || null,
          notes: form.notes.trim() || null,
        },
      };

      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to save patient");
      }
      const updated = (await res.json()) as PatientRecord;
      setPatient(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout>
        <div className="p-6 text-sm text-destructive">
          {error || "Patient not found"}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center gap-2 text-sm text-secondary hover:text-secondary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-2xl font-bold text-primary">
                {patient.name || "Patient"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {patient.ipp || "IPP not set"}
              </div>
              {form.birthDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(form.birthDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              Patient Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  IPP / MRN
                </label>
                <input
                  value={form.ipp}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ipp: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, birthDate: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Sex
                </label>
                <input
                  value={form.sex}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sex: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Condition
                </label>
                <input
                  value={form.condition}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, condition: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              Health Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={form.heightCm}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, heightCm: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={form.weightKg}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, weightKg: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Comorbidities
                </label>
                <textarea
                  value={form.comorbidities}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      comorbidities: e.target.value,
                    }))
                  }
                  className="mt-2 min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="mt-2 min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
