import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  getAuthToken: vi.fn(),
  refreshAuthSession: vi.fn(),
  clearAuth: vi.fn(),
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
      .mockResolvedValue({ ok: true, status: 200 } as Response);

    await apiFetch("/api/ping");

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer t");
    expect(init?.credentials).toBe("include");
  });

  it("n'écrase pas Authorization déjà fourni", async () => {
    const { getAuthToken } = await import("@/lib/auth");
    vi.mocked(getAuthToken).mockReturnValue("t");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, status: 200 } as Response);

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
      .mockResolvedValue({ ok: true, status: 200 } as Response);

    await apiFetch("/api/x", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("sur 401 tente refresh puis relance la requête", async () => {
    const { getAuthToken, refreshAuthSession } = await import("@/lib/auth");
    vi.mocked(getAuthToken)
      .mockReturnValueOnce("expired")
      .mockReturnValueOnce("fresh");
    vi.mocked(refreshAuthSession).mockResolvedValue(true);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const res = await apiFetch("/api/patients");

    expect(refreshAuthSession).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("ne tente pas de refresh sur /api/auth/login", async () => {
    const { refreshAuthSession } = await import("@/lib/auth");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    await apiFetch("/api/auth/login", { method: "POST" });

    expect(refreshAuthSession).not.toHaveBeenCalled();
  });
});
