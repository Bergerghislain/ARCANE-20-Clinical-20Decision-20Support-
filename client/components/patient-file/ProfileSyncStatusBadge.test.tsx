import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileSyncStatusBadge } from "@/components/patient-file/ProfileSyncStatusBadge";

describe("ProfileSyncStatusBadge", () => {
  it("affiche le statut synchronise", () => {
    render(
      <ProfileSyncStatusBadge
        status="synced"
        lastSavedAt="2026-07-15T10:00:00.000Z"
      />,
    );
    expect(screen.getByText(/Synchronisé avec le serveur/i)).toBeInTheDocument();
  });

  it("affiche le brouillon local actif", () => {
    render(
      <ProfileSyncStatusBadge
        status="local-draft"
        lastSavedAt="2026-07-15T10:00:00.000Z"
      />,
    );
    expect(screen.getByText(/Brouillon local actif/i)).toBeInTheDocument();
  });

  it("affiche l'erreur de synchronisation", () => {
    render(
      <ProfileSyncStatusBadge status="sync-error" lastSavedAt={null} />,
    );
    expect(
      screen.getByText(/Brouillon local uniquement — API indisponible/i),
    ).toBeInTheDocument();
  });

  it("affiche la synchronisation en cours", () => {
    render(
      <ProfileSyncStatusBadge status="saving" lastSavedAt={null} />,
    );
    expect(screen.getByText(/Synchronisation en cours/i)).toBeInTheDocument();
  });
});
