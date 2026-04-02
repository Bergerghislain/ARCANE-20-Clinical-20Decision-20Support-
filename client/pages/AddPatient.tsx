import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

function readCreatedPatientId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const raw = row.id ?? row.id_patient ?? row.patient_id;
  if (raw === null || raw === undefined) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  if (normalized < 1) return null;
  return String(normalized);
}

export default function AddPatient() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [ipp, setIpp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [condition, setCondition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage("Le nom du patient est obligatoire.");
      return;
    }

    const payload = {
      name: name.trim(),
      age: age === "" ? null : Number(age),
      gender: gender.trim() || undefined,
      ipp: ipp.trim() || undefined,
      birthDate: birthDate || undefined,
      status,
      condition: condition.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await res.json().catch(() => null);
      if (!res.ok) {
        let detail = "Impossible de creer ce patient.";
        if (responsePayload && typeof responsePayload === "object") {
          const maybeDetail = (responsePayload as Record<string, unknown>).detail;
          if (typeof maybeDetail === "string" && maybeDetail.trim()) {
            detail = maybeDetail;
          }
        }
        throw new Error(detail);
      }

      const createdId = readCreatedPatientId(responsePayload);
      if (!createdId) {
        throw new Error("Patient cree, mais identifiant de reponse introuvable.");
      }

      window.dispatchEvent(new Event("arcane:patients-updated"));
      navigate(`/patient/${createdId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Echec de creation du patient.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Add Patient</h1>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="IPP / MRN"
            value={ipp}
            onChange={(e) => setIpp(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Date of birth"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <Input
            placeholder="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          />
          <label className="block text-sm font-medium text-foreground">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <Input
            placeholder="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
