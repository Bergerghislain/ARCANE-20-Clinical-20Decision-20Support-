import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createArgosDiscussion,
  fetchArgosDiscussions,
  fetchArgosMessages,
  postArgosMessage,
  updateArgosDiscussion,
} from "@/lib/argosApi";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("argosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("charge les discussions avec filtre patient optionnel", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, patient_id: 2 }],
    } as Response);

    const all = await fetchArgosDiscussions();
    expect(apiFetch).toHaveBeenCalledWith("/api/argos/discussions");
    expect(all).toHaveLength(1);

    await fetchArgosDiscussions(5);
    expect(apiFetch).toHaveBeenCalledWith("/api/argos/discussions?patient_id=5");
  });

  it("échoue si le chargement des discussions retourne une erreur", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue({ ok: false } as Response);
    await expect(fetchArgosDiscussions()).rejects.toThrow(
      "Failed to load ARGOS discussions",
    );
  });

  it("crée une discussion ARGOS", async () => {
    const { apiFetch } = await import("@/lib/api");
    const payload = { id: 9, patient_id: 3, title: "Titre" };
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    const created = await createArgosDiscussion({
      patientId: 3,
      title: "Titre",
      context: "ctx",
    });

    expect(apiFetch).toHaveBeenCalledWith("/api/argos/discussions", {
      method: "POST",
      body: JSON.stringify({
        patient_id: 3,
        title: "Titre",
        context: "ctx",
      }),
    });
    expect(created).toEqual(payload);
  });

  it("met à jour le titre d'une discussion", async () => {
    const { apiFetch } = await import("@/lib/api");
    const payload = { id: 4, title: "Douleur thoracique" };
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    const updated = await updateArgosDiscussion(4, {
      title: "Douleur thoracique",
    });

    expect(apiFetch).toHaveBeenCalledWith("/api/argos/discussions/4", {
      method: "PATCH",
      body: JSON.stringify({ title: "Douleur thoracique" }),
    });
    expect(updated.title).toBe("Douleur thoracique");
  });

  it("charge et envoie des messages", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, content: "Bonjour" }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 2, content: "Réponse" }),
      } as Response);

    const messages = await fetchArgosMessages(7);
    expect(apiFetch).toHaveBeenCalledWith("/api/argos/discussions/7/messages");
    expect(messages).toHaveLength(1);

    const posted = await postArgosMessage(7, {
      message_type: "user_query",
      content: "Question",
      sections: { clinicalSynthesis: "Synthèse" },
    });
    expect(posted.content).toBe("Réponse");
  });

  it("propage les erreurs HTTP des mutations", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue({ ok: false } as Response);

    await expect(
      createArgosDiscussion({ patientId: 1 }),
    ).rejects.toThrow("Failed to create ARGOS discussion");
    await expect(
      updateArgosDiscussion(1, { title: "X" }),
    ).rejects.toThrow("Failed to update ARGOS discussion");
    await expect(fetchArgosMessages(1)).rejects.toThrow(
      "Failed to load ARGOS messages",
    );
    await expect(
      postArgosMessage(1, { message_type: "user_query", content: "x" }),
    ).rejects.toThrow("Failed to create ARGOS message");
  });
});
