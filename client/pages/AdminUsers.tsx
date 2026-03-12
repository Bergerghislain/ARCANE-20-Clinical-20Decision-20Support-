import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface AdminUserRow {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
}

type ApprovalRole = "clinician" | "researcher" | "admin";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<AdminUserRow[]>([]);
  const [activeClinicians, setActiveClinicians] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [processingIds, setProcessingIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      setUnauthorized(false);
      try {
        const [pendingRes, activeRes] = await Promise.all([
          apiFetch("/api/admin/users?status=EN_ATTENTE"),
          apiFetch("/api/admin/users?status=ACTIF"),
        ]);

        if (pendingRes.status === 403 || activeRes.status === 403) {
          setUnauthorized(true);
          setPendingUsers([]);
          setActiveClinicians([]);
          return;
        }

        if (!pendingRes.ok || !activeRes.ok) {
          throw new Error("Unable to load admin users");
        }

        const pendingData = (await pendingRes.json()) as AdminUserRow[];
        const activeData = (await activeRes.json()) as AdminUserRow[];

        setPendingUsers(pendingData);
        setActiveClinicians(
          activeData.filter(
            (user) =>
              user.is_active &&
              String(user.role || "").toLowerCase() === "clinician",
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleAction = async (
    id: number,
    action: "APPROVE" | "REJECT",
    role?: ApprovalRole,
  ) => {
    setError(null);
    setProcessingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const body = action === "APPROVE" ? { action, role } : { action };
      const res = await apiFetch(`/api/admin/users/${id}/validate`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const detail =
          (payload && payload.detail) || "Unable to update user role/status";
        throw new Error(detail);
      }
      const updated = (await res.json()) as AdminUserRow;
      const normalizedRole = String(updated.role || "").toLowerCase();

      // Le compte ne reste jamais dans la liste "en attente" après action admin.
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));

      if (action === "REJECT") {
        // Un compte rejeté est inactif : on le retire aussi des actifs.
        setActiveClinicians((prev) => prev.filter((u) => u.id !== id));
        return;
      }

      if (updated.is_active && normalizedRole === "clinician") {
        // Conserver la liste des cliniciens actifs à jour après validation.
        setActiveClinicians((prev) => {
          const withoutCurrent = prev.filter((u) => u.id !== updated.id);
          return [updated, ...withoutCurrent];
        });
      } else {
        // Si le rôle passe admin/researcher, il ne doit plus apparaître ici.
        setActiveClinicians((prev) => prev.filter((u) => u.id !== updated.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setProcessingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (unauthorized) {
    return (
      <MainLayout>
        <div className="p-6">
          <h1 className="text-xl font-bold mb-2">Accès refusé</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Cette page est réservée aux administrateurs ARCANE.
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
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Administration des comptes
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Depuis cette interface unique, vous pouvez valider les demandes
          d’inscription et promouvoir des cliniciens actifs au rôle admin.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Demandes en attente</h2>
              {pendingUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun compte en attente pour le moment.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">
                          Nom d’utilisateur
                        </th>
                        <th className="px-4 py-2 text-left font-medium">Rôle</th>
                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((user) => {
                        const isProcessing = Boolean(processingIds[user.id]);
                        return (
                          <tr key={user.id} className="border-t border-border/60">
                            <td className="px-4 py-2">{user.email}</td>
                            <td className="px-4 py-2">{user.username}</td>
                            <td className="px-4 py-2 capitalize">
                              {user.role || "clinician"}
                            </td>
                            <td className="px-4 py-2 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={isProcessing}
                                onClick={() =>
                                  handleAction(user.id, "APPROVE", "clinician")
                                }
                              >
                                Valider clinicien
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isProcessing}
                                onClick={() =>
                                  handleAction(user.id, "APPROVE", "admin")
                                }
                              >
                                Valider admin
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/40"
                                disabled={isProcessing}
                                onClick={() => handleAction(user.id, "REJECT")}
                              >
                                Rejeter
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Cliniciens actifs</h2>
              <p className="text-sm text-muted-foreground">
                Promotion possible vers admin depuis la même interface.
              </p>
              {activeClinicians.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun clinicien actif à promouvoir pour le moment.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">
                          Nom d’utilisateur
                        </th>
                        <th className="px-4 py-2 text-left font-medium">Rôle</th>
                        <th className="px-4 py-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeClinicians.map((user) => {
                        const isProcessing = Boolean(processingIds[user.id]);
                        return (
                          <tr key={user.id} className="border-t border-border/60">
                            <td className="px-4 py-2">{user.email}</td>
                            <td className="px-4 py-2">{user.username}</td>
                            <td className="px-4 py-2 capitalize">
                              {user.role || "clinician"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isProcessing}
                                onClick={() =>
                                  handleAction(user.id, "APPROVE", "admin")
                                }
                              >
                                Promouvoir admin
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

