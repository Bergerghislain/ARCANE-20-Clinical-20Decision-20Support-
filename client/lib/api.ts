import { getAuthToken } from "@/lib/auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

function buildUrl(path: string) {
  if (!API_BASE_URL) return path;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers);

  if (!headers.has("Authorization")) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  // Si on envoie une string JSON, forcer le content-type (sauf si déjà défini).
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}

