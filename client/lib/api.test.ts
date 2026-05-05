import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  getAuthToken: vi.fn(),
}));

describe("lib/api apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ajoute Authorization si absent et token dispo", async () => {
    const { getAuthToken } = await import("@/lib/auth");
    vi.mocked(getAuthToken).mockReturnValue("t");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    await apiFetch("/api/ping");

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer t");
  });

  it("n’écrase pas Authorization déjà fourni", async () => {
    const { getAuthToken } = await import("@/lib/auth");
    vi.mocked(getAuthToken).mockReturnValue("t");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    await apiFetch("/api/ping", {
      headers: { Authorization: "Bearer existing" },
    });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer existing");
  });

  it("force Content-Type application/json si body est string et pas de Content-Type", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    await apiFetch("/api/x", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});

