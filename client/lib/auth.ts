import { buildApiUrl } from "@/lib/apiUrl";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string | null;
}

const AUTH_USER_KEY = "arcane_auth_user";
const LEGACY_AUTH_TOKEN_KEY = "arcane_auth_token";

/** Jeton d'accès court : en mémoire uniquement (pas de localStorage). */
let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function migrateLegacyTokenFromLocalStorage(): void {
  const legacy = localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
  if (!legacy) return;
  inMemoryAccessToken = legacy;
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

migrateLegacyTokenFromLocalStorage();

export function isAuthenticated(): boolean {
  return Boolean(inMemoryAccessToken) || Boolean(getStoredUser());
}

export function getAuthToken(): string | null {
  return inMemoryAccessToken;
}

export function hasPersistedSession(): boolean {
  return Boolean(getStoredUser());
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  inMemoryAccessToken = token;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  inMemoryAccessToken = null;
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

/** Réinitialise le token en mémoire (tests uniquement). */
export function clearAccessTokenForTests(): void {
  inMemoryAccessToken = null;
}

/**
 * Appelle POST /api/auth/refresh (cookie HttpOnly) et met à jour le token en mémoire.
 * Déduplique les appels concurrents (un seul refresh à la fois).
 */
export async function refreshAuthSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildApiUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        clearAuth();
        return false;
      }
      const data = (await res.json()) as { token: string; user: AuthUser };
      setAuth(data.token, data.user);
      return true;
    } catch {
      clearAuth();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Au rechargement de page : le refresh cookie survit, pas le token mémoire.
 * On tente un refresh silencieux si un utilisateur était connecté.
 */
export async function bootstrapAuth(): Promise<void> {
  migrateLegacyTokenFromLocalStorage();
  if (inMemoryAccessToken) return;
  if (!getStoredUser()) return;
  await refreshAuthSession();
}

export async function logout(): Promise<void> {
  try {
    await fetch(buildApiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // La session locale est quand même effacée.
  } finally {
    clearAuth();
  }
}
