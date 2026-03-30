import React, { useState, useMemo } from "react";
import { ChevronDown, Search, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Patient {
  id: string;
  name: string;
  age?: number;
  condition?: string;
  mrn?: string;
  status?: "active" | "pending" | "completed" | "unknown";
}

interface PatientSelectorProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onNewConversation: (patient: Patient) => void;
  onLoadConversation: (patient: Patient) => void;
}

export function PatientSelector({
  patients,
  selectedPatient,
  onSelectPatient,
  onNewConversation,
  onLoadConversation,
}: PatientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = useMemo(() => {
    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.condition || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (patient.mrn &&
          patient.mrn.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [patients, searchQuery]);

  const handleSelectPatient = (patient: Patient) => {
    onSelectPatient(patient);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleNewConversation = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    onNewConversation(patient);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleLoadConversation = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    onLoadConversation(patient);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="border-b border-border/50 bg-gradient-to-r from-white to-blue-50 px-6 py-4 shadow-sm">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Selected Patient Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-white hover:border-secondary/50 transition-colors text-left"
          >
            <div>
              {selectedPatient ? (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedPatient.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.condition || "Unknown condition"} •{" "}
                    {typeof selectedPatient.age === "number"
                      ? selectedPatient.age
                      : "—"}{" "}
                    years
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Select a patient
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Choose a patient to start consulting with ARGOS
                  </p>
                </div>
              )}
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-lg border border-border bg-white shadow-lg">
              {/* Search Input */}
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, condition, or MRN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 py-2 text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {/* Patient List */}
              <div className="max-h-80 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="border-b border-border/50 last:border-b-0 p-3 hover:bg-primary/5 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">
                            {patient.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {patient.condition || "Unknown condition"} •{" "}
                            {typeof patient.age === "number"
                              ? patient.age
                              : "—"}{" "}
                            years
                          </p>
                          {patient.mrn && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {patient.mrn}
                            </p>
                          )}
                        </div>
                        {patient.status && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                              patient.status === "active"
                                ? "bg-success/10 text-success"
                                : patient.status === "pending"
                                  ? "bg-warning/10 text-warning"
                                  : patient.status === "completed"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {patient.status.charAt(0).toUpperCase() +
                              patient.status.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleNewConversation(e, patient)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                          title="Start a new conversation with this patient"
                        >
                          <Plus className="h-3 w-3" />
                          <span>New Chat</span>
                        </button>
                        <button
                          onClick={(e) => handleLoadConversation(e, patient)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-medium transition-colors"
                          title="Load a previous conversation with this patient"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>History</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No patients found
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Click outside to close */}
          {isOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
