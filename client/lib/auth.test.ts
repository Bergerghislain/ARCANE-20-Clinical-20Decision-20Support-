import { beforeEach, describe, expect, it } from "vitest";

import {
  clearAuth,
  getAuthToken,
  getStoredUser,
  isAuthenticated,
  setAuth,
} from "@/lib/auth";

describe("lib/auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isAuthenticated reflète la présence du token", () => {
    expect(isAuthenticated()).toBe(false);
    localStorage.setItem("arcane_auth_token", "t");
    expect(isAuthenticated()).toBe(true);
  });

  it("setAuth stocke token + user et getAuthToken/getStoredUser les relisent", () => {
    setAuth("tok", { id: 1, username: "u", email: "e", role: "admin" });
    expect(getAuthToken()).toBe("tok");
    expect(getStoredUser()).toMatchObject({ id: 1, role: "admin" });
  });

  it("getStoredUser retourne null si JSON invalide", () => {
    localStorage.setItem("arcane_auth_user", "{broken");
    expect(getStoredUser()).toBeNull();
  });

  it("clearAuth supprime token + user", () => {
    setAuth("tok", { id: 1, username: "u", email: "e", role: "admin" });
    clearAuth();
    expect(getAuthToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });
});

