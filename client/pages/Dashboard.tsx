import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

import {
  Search,
  Plus,
  Bot,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface Patient {
  id: string;
  name?: string | null;
  age?: number | null;
  condition?: string | null;
  mrn?: string | null;
  birthDate?: string | null;
  lastVisit?: string | null;
  status?: "active" | "completed" | "pending" | null;
}

const PATIENTS_PAGE_SIZE = 24;

function normalizePatient(row: any, index: number): Patient {
  const id =
    row?.id ??
    row?.id_patient ??
    row?.patient_id ??
    row?.ipp ??
    `row_${index}`;
  const lastVisit = row?.lastVisit ?? row?.last_visit_date;
  const lastVisitIso =
    typeof lastVisit === "string" && lastVisit
      ? lastVisit
      : row?.last_visit_date_year
        ? new Date(
            Number(row.last_visit_date_year),
            Math.max(0, Number(row.last_visit_date_month || 1) - 1),
            1,
          ).toISOString()
        : null;
  const birthDateIso =
    row?.birth_date_year
      ? new Date(
          Number(row.birth_date_year),
          Math.max(0, Number(row.birth_date_month || 1) - 1),
          Math.max(1, Number(row.birth_date_day || 1)),
        ).toISOString()
      : null;

  const fallbackName = row?.ipp ? `IPP ${row.ipp}` : null;

  return {
    id: String(id),
    name: row?.name ?? row?.full_name ?? fallbackName,
    age:
      typeof row?.age === "number"
        ? row.age
        : row?.birth_date_year
          ? new Date().getFullYear() - Number(row.birth_date_year)
          : null,
    condition: row?.condition ?? row?.diagnosis ?? null,
    mrn: row?.ipp ?? String(id),
    birthDate: birthDateIso,
    lastVisit: lastVisitIso,
    status: row?.status ?? "active",
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePatients, setHasMorePatients] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Patient["status"] | "all">("all");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPatientsPage = useCallback(
    async (
      offset: number,
      mode: "replace" | "append" = "replace",
    ): Promise<boolean> => {
      const res = await apiFetch(
        `/api/patients?limit=${PATIENTS_PAGE_SIZE}&offset=${offset}`,
      );
      if (!res.ok) {
        if (mode === "replace") setPatients([]);
        setHasMorePatients(false);
        return false;
      }
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((row, index) => normalizePatient(row, offset + index))
        : [];
      setHasMorePatients(normalized.length === PATIENTS_PAGE_SIZE);
      if (mode === "replace") {
        setPatients(normalized);
      } else {
        setPatients((current) => {
          const existingIds = new Set(current.map((patient) => patient.id));
          const incoming = normalized.filter((patient) => !existingIds.has(patient.id));
          return [...current, ...incoming];
        });
      }
      return true;
    },
    [],
  );

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        await fetchPatientsPage(0, "replace");
      } catch (error) {
        console.error("Failed to load patients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchPatients();
  }, [fetchPatientsPage]);

  const handleImportJson = async (file: File) => {
    setImportError(null);
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await apiFetch("/api/patients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let message = "Import failed";
        try {
          const errorPayload = await res.json();
          if (typeof errorPayload?.details === "string") {
            message = errorPayload.details;
          } else if (typeof errorPayload?.error === "string") {
            message = errorPayload.error;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }
      await fetchPatientsPage(0, "replace");
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to import file",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPatients = useMemo(
    () =>
      patients.filter((patient) => {
        const nameValue = patient.name ?? "";
        const conditionValue = patient.condition ?? "";
        const matchesSearch =
          normalizedSearch.length === 0 ||
          nameValue.toLowerCase().includes(normalizedSearch) ||
          conditionValue.toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "all" || patient.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [patients, normalizedSearch, statusFilter],
  );

  const filteredStats = useMemo(
    () =>
      filteredPatients.reduce(
        (acc, patient) => {
          if (patient.status === "active") acc.active += 1;
          if (patient.status === "pending") acc.pending += 1;
          if (patient.status === "completed") acc.completed += 1;
          return acc;
        },
        { active: 0, pending: 0, completed: 0 },
      ),
    [filteredPatients],
  );

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMorePatients) return;
    setIsLoadingMore(true);
    try {
      await fetchPatientsPage(patients.length, "append");
    } catch (error) {
      console.error("Failed to load more patients:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getStatusColor = (status: Patient["status"]) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "completed":
        return "bg-primary/10 text-primary";
      case "pending":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: Patient["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* En‑tête */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-primary">Dashboard Clinicien</h1>
              <p className="mt-2 text-muted-foreground">
                Manage your patients and access ARGOS clinical decision support
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
            <Button
  variant="default"
  size="lg"
  onClick={() => navigate("/add-patient")}
>
  <Plus className="mr-2 h-5 w-5" />
  Add Patient
</Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleImportJson(file);
                    event.target.value = "";
                  }
                }}
              />
              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import JSON"}
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate("/argos")}
              >
                <Bot className="mr-2 h-5 w-5" />
                Open ARGOS
              </Button>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="mx-auto max-w-7xl px-6 py-8">
          {importError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {importError}
            </div>
          )}
          {/* Recherche et filtres */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by patient name or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["all", "active", "pending", "completed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des patients */}
          <div className="mb-3 text-xs text-muted-foreground">
            {isLoading
              ? "Loading patients..."
              : `${patients.length} patient(s) loaded`}
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                <p className="text-muted-foreground">Loading patients...</p>
              </div>
            ) : filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <Link
                  key={patient.id}
                  to={`/patient/${patient.id}`}
                  className="group block rounded-2xl border border-border bg-gradient-to-br from-white to-blue-50/30 p-6 transition-all hover:shadow-xl hover:border-secondary/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {patient.name || "Unknown patient"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(patient.status)}`}
                        >
                          {getStatusIcon(patient.status)}
                          {(patient.status || "active").charAt(0).toUpperCase() +
                            (patient.status || "active").slice(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                        <div>
                          <span className="font-medium text-foreground">
                            {typeof patient.age === "number" ? patient.age : "—"}
                          </span>{" "}
                          years
                        </div>
                        <div>{patient.condition || "Unknown condition"}</div>
                        <div>
                          {patient.birthDate
                            ? new Date(patient.birthDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Unknown birth date"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {patient.lastVisit
                            ? new Date(patient.lastVisit).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-secondary text-secondary hover:bg-secondary/10"
                        aria-label={`Open ARGOS for ${patient.name || "patient"}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/argos", {
                            state: {
                              patient: {
                                id: patient.id,
                                name: patient.name || "Unknown patient",
                                age:
                                  typeof patient.age === "number"
                                    ? patient.age
                                    : 0,
                                condition:
                                  patient.condition || "Unknown condition",
                                mrn: patient.mrn || patient.id,
                                status: patient.status || "active",
                              },
                            },
                          });
                        }}
                      >
                        <Bot className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/patient/${patient.id}`);
                        }}
                      >
                        <span className="text-xs font-medium">Open</span>
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No patients found</p>
              </div>
            )}
          </div>
          {!isLoading && hasMorePatients && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  void handleLoadMore();
                }}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading..." : "Load more patients"}
              </Button>
            </div>
          )}

          {/* Statistiques */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm font-semibold text-muted-foreground">
                Active Patients
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                {filteredStats.active}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm font-semibold text-muted-foreground">
                Pending Review
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-warning to-amber-600 bg-clip-text text-transparent">
                {filteredStats.pending}
              </p>
            </div>
            <div className="rounded-2xl border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm font-semibold text-muted-foreground">
                Completed Cases
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-success to-emerald-600 bg-clip-text text-transparent">
                {filteredStats.completed}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
