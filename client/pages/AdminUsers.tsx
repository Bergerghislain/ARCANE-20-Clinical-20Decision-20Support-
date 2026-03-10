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

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await apiFetch("/api/admin/users?status=EN_ATTENTE");
        if (res.status === 403) {
          setUnauthorized(true);
          setUsers([]);
          return;
        }
        if (!res.ok) {
          throw new Error("Unable to load pending users");
        }
        const data = (await res.json()) as AdminUserRow[];
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleValidate = async (id: number, action: "APPROVE" | "REJECT") => {
    try {
      const body =
        action === "APPROVE"
          ? { action, role: "clinician" as const }
          : { action };
      const res = await apiFetch(`/api/admin/users/${id}/validate`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error("Unable to validate user");
      }
      // Rafraîchir la liste des comptes en attente
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate user");
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
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-4">
          Comptes en attente de validation
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Validez les comptes clinicien en attente ou rejetez les demandes
          non conformes.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : users.length === 0 ? (
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
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border/60">
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.username}</td>
                    <td className="px-4 py-2 capitalize">
                      {u.role || "clinician"}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleValidate(u.id, "APPROVE")}
                      >
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/40"
                        onClick={() => handleValidate(u.id, "REJECT")}
                      >
                        Rejeter
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

