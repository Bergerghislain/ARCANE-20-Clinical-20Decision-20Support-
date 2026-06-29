import {
  clearAuth,
  getAuthToken,
  refreshAuthSession,
} from "@/lib/auth";
import { buildApiUrl } from "@/lib/apiUrl";

const NO_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
];

function shouldAttemptRefresh(path: string): boolean {
  return !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix));
}

function redirectToLoginIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  window.location.assign("/login");
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<Response> {
  const url = buildApiUrl(path);
  const headers = new Headers(init.headers);

  if (!headers.has("Authorization")) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  if (
    response.status === 401 &&
    !isRetry &&
    shouldAttemptRefresh(path)
  ) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      const retryInit: RequestInit = { ...init };
      const retryHeaders = new Headers(init.headers);
      retryHeaders.delete("Authorization");
      retryInit.headers = retryHeaders;
      return apiFetch(path, retryInit, true);
    }
    clearAuth();
    redirectToLoginIfNeeded();
  }

  return response;
}
