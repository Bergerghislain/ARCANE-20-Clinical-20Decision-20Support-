import { Cloud, CloudOff, HardDrive, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ProfileSyncStatus =
  | "synced"
  | "local-draft"
  | "saving"
  | "sync-error";

interface ProfileSyncStatusBadgeProps {
  status: ProfileSyncStatus;
  lastSavedAt: string | null;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-FR");
  } catch {
    return "";
  }
}

export function ProfileSyncStatusBadge({
  status,
  lastSavedAt,
}: ProfileSyncStatusBadgeProps) {
  const when = formatWhen(lastSavedAt);

  if (status === "saving") {
    return (
      <Badge variant="secondary" className="gap-1.5 font-normal">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Synchronisation en cours…
      </Badge>
    );
  }

  if (status === "synced") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-300 bg-emerald-50 font-normal text-emerald-900"
      >
        <Cloud className="h-3.5 w-3.5" />
        Synchronisé avec le serveur{when ? ` · ${when}` : ""}
      </Badge>
    );
  }

  if (status === "sync-error") {
    return (
      <Badge variant="destructive" className="gap-1.5 font-normal">
        <CloudOff className="h-3.5 w-3.5" />
        Brouillon local uniquement — API indisponible
        {when ? ` · ${when}` : ""}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-amber-300 bg-amber-50 font-normal text-amber-950"
    >
      <HardDrive className="h-3.5 w-3.5" />
      Brouillon local actif{when ? ` · ${when}` : ""}
    </Badge>
  );
}
