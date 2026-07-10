#!/usr/bin/env node
/**
 * Vérifie les seuils de couverture frontend (client/lib + pages critiques).
 * S'appuie sur coverage/coverage-final.json produit par `pnpm run test:coverage`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COVERAGE_FILE = path.join(REPO_ROOT, "coverage", "coverage-final.json");

/** Seuils agrégés par répertoire (statements). */
const DIRECTORY_THRESHOLDS = {
  "client/lib": 65,
  "client/pages": 65,
};

/** Seuils par fichier critique (suffixe relatif). */
const CRITICAL_FILE_THRESHOLDS = {
  "client/lib/auth.ts": 75,
  "client/lib/patientReport.ts": 80,
  "client/lib/api.ts": 75,
  "client/lib/argosApi.ts": 85,
  "client/lib/argosMappers.ts": 80,
  "client/lib/argosDiscussionTitle.ts": 90,
  "client/lib/argosConversationUtils.ts": 90,
  "client/lib/aiStreamPartialJson.ts": 85,
  "client/pages/Dashboard.tsx": 85,
  "client/pages/PatientFile.tsx": 75,
  "client/pages/Login.tsx": 85,
};

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function toRelativeClientPath(absPath) {
  const norm = normalizePath(absPath);
  const idx = norm.indexOf("client/");
  if (idx === -1) return null;
  return norm.slice(idx);
}

function statementCoverage(entry) {
  const counts = Object.values(entry.s ?? {});
  if (counts.length === 0) return { covered: 0, total: 0, pct: 100 };
  const covered = counts.filter((value) => value > 0).length;
  return {
    covered,
    total: counts.length,
    pct: (covered * 100) / counts.length,
  };
}

function loadCoverageByRelativePath() {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error("[ERR] Fichier coverage-final.json introuvable. Lancez pnpm run test:coverage.");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(COVERAGE_FILE, "utf8"));
  const byRel = new Map();

  for (const [absPath, entry] of Object.entries(raw)) {
    const rel = toRelativeClientPath(absPath);
    if (!rel) continue;
    byRel.set(rel, statementCoverage(entry));
  }

  return byRel;
}

function aggregateDirectory(byRel, dirPrefix) {
  let covered = 0;
  let total = 0;
  for (const [rel, stats] of byRel.entries()) {
    if (!rel.startsWith(`${dirPrefix}/`)) continue;
    if (rel.includes(".test.") || rel.includes(".spec.")) continue;
    covered += stats.covered;
    total += stats.total;
  }
  if (total === 0) return null;
  return { covered, total, pct: (covered * 100) / total };
}

function main() {
  const byRel = loadCoverageByRelativePath();
  let failed = false;

  for (const [dirPrefix, threshold] of Object.entries(DIRECTORY_THRESHOLDS)) {
    const stats = aggregateDirectory(byRel, dirPrefix);
    if (!stats) {
      console.log(`[ERR] Aucune couverture mesurée pour ${dirPrefix}`);
      failed = true;
      continue;
    }
    const status = stats.pct >= threshold ? "OK" : "FAIL";
    console.log(
      `[${status}] ${dirPrefix}: ${stats.pct.toFixed(1)}% (seuil ${threshold}%)`,
    );
    if (stats.pct < threshold) failed = true;
  }

  for (const [relSuffix, threshold] of Object.entries(CRITICAL_FILE_THRESHOLDS)) {
    const stats = byRel.get(relSuffix);
    if (!stats) {
      console.log(`[ERR] Fichier non mesuré: ${relSuffix}`);
      failed = true;
      continue;
    }
    const status = stats.pct >= threshold ? "OK" : "FAIL";
    console.log(
      `[${status}] ${relSuffix}: ${stats.pct.toFixed(1)}% (seuil ${threshold}%)`,
    );
    if (stats.pct < threshold) failed = true;
  }

  process.exit(failed ? 1 : 0);
}

main();
