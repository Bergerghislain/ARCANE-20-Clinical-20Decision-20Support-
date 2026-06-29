import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bootstrapAuth,
  clearAccessTokenForTests,
  clearAuth,
  getAuthToken,
  getStoredUser,
  hasPersistedSession,
  isAuthenticated,
  refreshAuthSession,
  setAuth,
} from "@/lib/auth";

describe("lib/auth", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAccessTokenForTests();
    vi.restoreAllMocks();
  });

  it("isAuthenticated reflète le token mémoire ou une session persistée", () => {
    expect(isAuthenticated()).toBe(false);
    setAuth("tok", { id: 1, username: "u", email: "e", role: "admin" });
    expect(isAuthenticated()).toBe(true);
    expect(getAuthToken()).toBe("tok");
    clearAccessTokenForTests();
    expect(getAuthToken()).toBeNull();
    expect(isAuthenticated()).toBe(true);
    expect(hasPersistedSession()).toBe(true);
  });

  it("ne stocke pas le token dans localStorage", () => {
    setAuth("secret-token", { id: 1, username: "u", email: "e", role: "admin" });
    expect(localStorage.getItem("arcane_auth_token")).toBeNull();
    expect(getAuthToken()).toBe("secret-token");
  });

  it("migre un ancien token localStorage vers la mémoire au chargement du module", async () => {
    clearAuth();
    clearAccessTokenForTests();
    localStorage.setItem("arcane_auth_token", "legacy");
    localStorage.setItem(
      "arcane_auth_user",
      JSON.stringify({ id: 1, username: "u", email: "e", role: "admin" }),
    );
    vi.resetModules();
    const auth = await import("@/lib/auth");
    expect(auth.getAuthToken()).toBe("legacy");
    expect(localStorage.getItem("arcane_auth_token")).toBeNull();
  });

  it("setAuth stocke le user en localStorage", () => {
    setAuth("tok", { id: 1, username: "u", email: "e", role: "admin" });
    expect(getStoredUser()).toMatchObject({ id: 1, role: "admin" });
  });

  it("getStoredUser retourne null si JSON invalide", () => {
    localStorage.setItem("arcane_auth_user", "{broken");
    expect(getStoredUser()).toBeNull();
  });

  it("clearAuth supprime token mémoire + user", () => {
    setAuth("tok", { id: 1, username: "u", email: "e", role: "admin" });
    clearAuth();
    expect(getAuthToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("refreshAuthSession met à jour le token via le cookie refresh", async () => {
    setAuth("expired", { id: 1, username: "u", email: "e", role: "admin" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "fresh",
        user: { id: 1, username: "u", email: "e", role: "admin" },
      }),
    } as Response);

    const ok = await refreshAuthSession();
    expect(ok).toBe(true);
    expect(getAuthToken()).toBe("fresh");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("bootstrapAuth tente un refresh si user persisté sans token mémoire", async () => {
    localStorage.setItem(
      "arcane_auth_user",
      JSON.stringify({ id: 1, username: "u", email: "e", role: "admin" }),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "bootstrapped",
        user: { id: 1, username: "u", email: "e", role: "admin" },
      }),
    } as Response);

    await bootstrapAuth();
    expect(getAuthToken()).toBe("bootstrapped");
    expect(fetchSpy).toHaveBeenCalled();
  });
});
