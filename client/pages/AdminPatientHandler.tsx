import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface AdminUserRow {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
}

interface PatientApiRow {
  id_patient?: number | string;
  id?: number | string;
  name?: string | null;
  ipp?: string | null;
  status?: string | null;
  assigned_clinician_id?: number | string | null;
}

interface PatientVm {
  id: number;
  name: string;
  ipp: string;
  status: string;
  assignedClinicianId: number | null;
}

interface ClinicianOption {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
}

const PATIENT_HANDLER_PAGE_SIZE = 200;
const PATIENT_HANDLER_MAX_PAGES = 20;

function readOptionalInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  if (normalized < 1) return null;
  return normalized;
}

function normalizePatient(row: PatientApiRow, index: number): PatientVm {
  const id =
    readOptionalInt(row.id_patient ?? row.id) ?? Math.max(1, index + 1);
  return {
    id,
    name: String(row.name || `Patient ${id}`),
    ipp: String(row.ipp || `IPP-${id}`),
    status: String(row.status || "pending").toLowerCase(),
    assignedClinicianId: readOptionalInt(row.assigned_clinician_id),
  };
}

function normalizeClinicians(
  rows: AdminUserRow[],
  sourceStatus: "ACTIF" | "EN_ATTENTE",
): ClinicianOption[] {
  return rows
    .filter((row) => String(row.role || "").toLowerCase() === "clinician")
    .map((row) => {
      const id = readOptionalInt(row.id);
      if (!id) return null;
      return {
        id,
        username: String(row.username || `clinician_${id}`),
        email: String(row.email || "email-inconnu"),
        isActive: sourceStatus === "ACTIF",
      };
    })
    .filter((row): row is ClinicianOption => row !== null);
}

export default function AdminPatientHandler() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientVm[]>([]);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [selectedByPatient, setSelectedByPatient] = useState<Record<number, string>>({});
  const [processingByPatient, setProcessingByPatient] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setSuccessMessage(null);
      setLoading(true);
      setUnauthorized(false);
      try {
        const user = getStoredUser();
        if (String(user?.role || "").toLowerCase() !== "admin") {
          setUnauthorized(true);
          return;
        }

        const [activeRes, pendingRes] = await Promise.all([
          apiFetch("/api/admin/users?status=ACTIF"),
          apiFetch("/api/admin/users?status=EN_ATTENTE"),
        ]);

        if (activeRes.status === 403 || pendingRes.status === 403) {
          setUnauthorized(true);
          return;
        }
        if (!activeRes.ok || !pendingRes.ok) {
          throw new Error("Impossible de charger la liste des cliniciens.");
        }

        const activeRows = (await activeRes.json()) as AdminUserRow[];
        const pendingRows = (await pendingRes.json()) as AdminUserRow[];

        const mergedClinicians = new Map<number, ClinicianOption>();
        for (const clinician of normalizeClinicians(activeRows, "ACTIF")) {
          mergedClinicians.set(clinician.id, clinician);
        }
        for (const clinician of normalizeClinicians(pendingRows, "EN_ATTENTE")) {
          if (!mergedClinicians.has(clinician.id)) {
            mergedClinicians.set(clinician.id, clinician);
          }
        }

        const clinicianList = Array.from(mergedClinicians.values()).sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return a.username.localeCompare(b.username);
        });
        setClinicians(clinicianList);

        const loadedPatients: PatientVm[] = [];
        for (let page = 0; page < PATIENT_HANDLER_MAX_PAGES; page += 1) {
          const offset = page * PATIENT_HANDLER_PAGE_SIZE;
          const patientsRes = await apiFetch(
            `/api/patients?limit=${PATIENT_HANDLER_PAGE_SIZE}&offset=${offset}`,
          );
          if (patientsRes.status === 403) {
            setUnauthorized(true);
            return;
          }
          if (!patientsRes.ok) {
            throw new Error("Impossible de charger la liste des patients.");
          }
          const payload = await patientsRes.json();
          const rows = Array.isArray(payload) ? (payload as PatientApiRow[]) : [];
          loadedPatients.push(
            ...rows.map((row, index) => normalizePatient(row, offset + index)),
          );
          if (rows.length < PATIENT_HANDLER_PAGE_SIZE) break;
        }

        const dedupById = new Map<number, PatientVm>();
        for (const row of loadedPatients) dedupById.set(row.id, row);
        const sortedPatients = Array.from(dedupById.values()).sort((a, b) => a.id - b.id);
        setPatients(sortedPatients);

        const defaultSelection: Record<number, string> = {};
        for (const patient of sortedPatients) {
          if (patient.assignedClinicianId) {
            defaultSelection[patient.id] = String(patient.assignedClinicianId);
          }
        }
        setSelectedByPatient(defaultSelection);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erreur pendant le chargement.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const clinicianById = useMemo(
    () => new Map<number, ClinicianOption>(clinicians.map((row) => [row.id, row])),
    [clinicians],
  );

  const activeCliniciansCount = useMemo(
    () => clinicians.filter((row) => row.isActive).length,
    [clinicians],
  );

  const pendingCliniciansCount = useMemo(
    () => clinicians.filter((row) => !row.isActive).length,
    [clinicians],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredPatients = useMemo(() => {
    if (!normalizedSearch) return patients;
    return patients.filter((patient) => {
      const assigned = patient.assignedClinicianId
        ? clinicianById.get(patient.assignedClinicianId)
        : null;
      return (
        patient.name.toLowerCase().includes(normalizedSearch) ||
        patient.ipp.toLowerCase().includes(normalizedSearch) ||
        String(patient.id).includes(normalizedSearch) ||
        (assigned?.username || "").toLowerCase().includes(normalizedSearch) ||
        (assigned?.email || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [patients, normalizedSearch, clinicianById]);

  const clinicianLabel = (clinicianId: number | null): string => {
    if (!clinicianId) return "Non assigne";
    const clinician = clinicianById.get(clinicianId);
    if (!clinician) return `Clinicien #${clinicianId}`;
    return `${clinician.username} (${clinician.isActive ? "ACTIF" : "EN_ATTENTE"})`;
  };

  const handleReassign = async (patient: PatientVm) => {
    setError(null);
    setSuccessMessage(null);

    const selected = selectedByPatient[patient.id];
    const clinicianId = readOptionalInt(selected);
    if (!clinicianId) {
      setError("Selectionnez un clinicien valide avant de reaffecter.");
      return;
    }

    setProcessingByPatient((prev) => ({ ...prev, [patient.id]: true }));
    try {
      const res = await apiFetch(`/api/patients/${patient.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ clinician_id: clinicianId }),
      });
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          (payload && typeof payload.detail === "string" && payload.detail) ||
          (payload && typeof payload.error === "string" && payload.error) ||
          "La reaffectation a echoue.";
        throw new Error(detail);
      }

      setPatients((current) =>
        current.map((row) =>
          row.id === patient.id
            ? { ...row, assignedClinicianId: clinicianId }
            : row,
        ),
      );
      const target = clinicianById.get(clinicianId);
      const targetLabel = target ? `${target.username} (${target.email})` : `clinicien #${clinicianId}`;
      setSuccessMessage(
        `Patient ${patient.name} (${patient.ipp}) reassigne vers ${targetLabel}.`,
      );
    } catch (reassignError) {
      setError(
        reassignError instanceof Error
          ? reassignError.message
          : "Erreur pendant la reaffectation.",
      );
    } finally {
      setProcessingByPatient((prev) => ({ ...prev, [patient.id]: false }));
    }
  };

  if (unauthorized) {
    return (
      <MainLayout>
        <div className="p-6">
          <h1 className="mb-2 text-xl font-bold">Acces refuse</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Cette vue et ces operations sont reservees aux administrateurs.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Retour au dashboard
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary">Patient Handler</h1>
          <p className="text-sm text-muted-foreground">
            Vue admin pour reaffecter un patient a un autre clinicien (actif ou en attente).
          </p>
          <p className="text-xs text-muted-foreground">
            Routes API utilisees: GET /api/patients, GET /api/admin/users, POST /api/patients/{"{id}"}/assign.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Patients charges</p>
            <p className="mt-1 text-2xl font-semibold">{patients.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Cliniciens actifs</p>
            <p className="mt-1 text-2xl font-semibold">{activeCliniciansCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Cliniciens en attente</p>
            <p className="mt-1 text-2xl font-semibold">{pendingCliniciansCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom patient, IPP, id ou clinicien..."
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-emerald-300/40 bg-emerald-50 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : filteredPatients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Aucun patient a afficher pour ce filtre.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Patient</th>
                  <th className="px-4 py-2 text-left font-medium">IPP</th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
                  <th className="px-4 py-2 text-left font-medium">Clinicien actuel</th>
                  <th className="px-4 py-2 text-left font-medium">Nouveau clinicien</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const selectedClinician = selectedByPatient[patient.id] || "";
                  const selectedClinicianId = readOptionalInt(selectedClinician);
                  const isAlreadyAssigned =
                    selectedClinicianId !== null &&
                    selectedClinicianId === patient.assignedClinicianId;
                  const isProcessing = Boolean(processingByPatient[patient.id]);
                  return (
                    <tr key={patient.id} className="border-t border-border/60">
                      <td className="px-4 py-2">
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-xs text-muted-foreground">ID #{patient.id}</div>
                      </td>
                      <td className="px-4 py-2">{patient.ipp}</td>
                      <td className="px-4 py-2">{patient.status || "pending"}</td>
                      <td className="px-4 py-2">
                        {clinicianLabel(patient.assignedClinicianId)}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={selectedClinician}
                          onChange={(event) =>
                            setSelectedByPatient((prev) => ({
                              ...prev,
                              [patient.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selectionner un clinicien...</option>
                          {clinicians.map((clinician) => (
                            <option key={clinician.id} value={String(clinician.id)}>
                              {clinician.username} ({clinician.email}) -{" "}
                              {clinician.isActive ? "ACTIF" : "EN_ATTENTE"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          disabled={
                            isProcessing ||
                            !selectedClinicianId ||
                            clinicians.length === 0 ||
                            isAlreadyAssigned
                          }
                          onClick={() => {
                            void handleReassign(patient);
                          }}
                        >
                          {isProcessing
                            ? "Reaffectation..."
                            : isAlreadyAssigned
                              ? "Deja assigne"
                              : "Reaffecter"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
