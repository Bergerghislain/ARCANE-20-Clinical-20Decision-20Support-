import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  name: string;
  age: number;
  condition: string;
  lastVisit: string;
  status: "active" | "completed" | "pending";
}

const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Marie Dubois",
    age: 52,
    condition: "Rare Lymphoma",
    lastVisit: "2025-01-14",
    status: "active",
  },
  {
    id: "2",
    name: "Jean Martin",
    age: 67,
    condition: "Sarcoma of the Jaw",
    lastVisit: "2025-01-10",
    status: "pending",
  },
  {
    id: "3",
    name: "Sophie Bernard",
    age: 45,
    condition: "Neuroendocrine Tumor",
    lastVisit: "2025-01-08",
    status: "active",
  },
  {
    id: "4",
    name: "Pierre Leclerc",
    age: 59,
    condition: "Angiosarcoma",
    lastVisit: "2025-01-05",
    status: "completed",
  },
  {
    id: "5",
    name: "Isabelle Fournier",
    age: 38,
    condition: "Epithelioid Sarcoma",
    lastVisit: "2025-01-12",
    status: "active",
  },
];

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Patient["status"] | "all">(
    "all",
  );

  const filteredPatients = mockPatients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        {/* Header Section */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-primary">
                Dashboard Clinicien
              </h1>
              <p className="mt-2 text-muted-foreground">
                Manage your patients and access ARGOS clinical decision support
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="default" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Patient
              </Button>
              <Button variant="secondary" size="lg">
                <Bot className="mr-2 h-5 w-5" />
                Open ARGOS
              </Button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Search and Filters */}
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
              {(["all", "active", "pending", "completed"] as const).map(
                (status) => (
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
                ),
              )}
            </div>
          </div>

          {/* Patient List */}
          <div className="space-y-3">
            {filteredPatients.length > 0 ? (
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
                          {patient.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(patient.status)}`}
                        >
                          {getStatusIcon(patient.status)}
                          {patient.status.charAt(0).toUpperCase() +
                            patient.status.slice(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                        <div>
                          <span className="font-medium text-foreground">
                            {patient.age}
                          </span>{" "}
                          years
                        </div>
                        <div>{patient.condition}</div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(patient.lastVisit).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-secondary text-secondary hover:bg-secondary/10"
                        onClick={(e) => {
                          e.preventDefault();
                          // Handle ARGOS click
                        }}
                      >
                        <Bot className="h-4 w-4" />
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

          {/* Stats */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm font-semibold text-muted-foreground">
                Active Patients
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                {mockPatients.filter((p) => p.status === "active").length}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm font-semibold text-muted-foreground">
                Pending Review
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-warning to-amber-600 bg-clip-text text-transparent">
                {mockPatients.filter((p) => p.status === "pending").length}
              </p>
            </div>
            <div className="rounded-2xl border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm font-semibold text-muted-foreground">
                Completed Cases
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-success to-emerald-600 bg-clip-text text-transparent">
                {mockPatients.filter((p) => p.status === "completed").length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
