/**
 * Liste dashboard : cache navigateur (sessionStorage) pour affichage rapide.
 * Les donnees detaillees d'un patient viennent toujours de GET /api/patients/:id (BD).
 */
const STORAGE_KEY = "arcane_patients_list_cache_v1";
const MAX_AGE_MS = 300_000;

type CacheEnvelope = { storedAt: number; raw: unknown };

export function stashPatientsListPayload(raw: unknown): void {
  try {
    const env: CacheEnvelope = { storedAt: Date.now(), raw };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  } catch {
    /* quota / mode privé */
  }
}

export function readPatientsListCache(): unknown[] | null {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s) as Partial<CacheEnvelope>;
    if (typeof parsed.storedAt !== "number" || !("raw" in parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.storedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!Array.isArray(parsed.raw)) {
      return null;
    }
    return parsed.raw;
  } catch {
    return null;
  }
}

export function clearPatientsListCache(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Repere une ligne du cache liste (meme id / id_patient / ipp) pour apercu avant chargement BD. */
export function findPatientRowInListCache(patientId: string): unknown | null {
  const rows = readPatientsListCache();
  if (!rows) return null;
  const want = String(patientId).trim();
  if (!want) return null;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const rid = String(r.id_patient ?? r.id ?? r.ipp ?? "").trim();
    if (rid === want) return row;
  }
  return null;
}
