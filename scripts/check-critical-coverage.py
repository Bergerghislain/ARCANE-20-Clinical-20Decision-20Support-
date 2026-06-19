#!/usr/bin/env python3
"""Vérifie les seuils de couverture sur les modules métier critiques."""
from __future__ import annotations

import sys
from pathlib import Path

import coverage

REPO_ROOT = Path(__file__).resolve().parents[1]
CRITICAL_SUFFIXES: dict[str, float] = {
  "patient_clinical_write.py": 80.0,
  "argos_repository.py": 80.0,
  "patient_clinical.py": 80.0,
}


def main() -> int:
  data_file = REPO_ROOT / "backend_fastapi" / ".coverage"
  if not data_file.exists():
    data_file = REPO_ROOT / ".coverage"
  if not data_file.exists():
    print("[ERR] Fichier .coverage introuvable. Lancez pytest avec --cov d'abord.")
    return 1

  cov = coverage.Coverage(data_file=str(data_file))
  cov.load()
  measured = cov.get_data().measured_files()

  failed = False
  for suffix, threshold in CRITICAL_SUFFIXES.items():
    matches = [path for path in measured if Path(path).name == suffix]
    if not matches:
      print(f"[ERR] Module non mesuré: *{suffix}")
      failed = True
      continue
    for path in matches:
      try:
        analysis = cov.analysis(path)
      except Exception:
        analysis = cov.analysis2(path)
      filename, executable, missing, _ = analysis[:4]
      del filename
      total = len(executable)
      if total == 0:
        print(f"[WARN] {path}: aucune ligne exécutable")
        continue
      covered = total - len(missing)
      pct = covered * 100.0 / total
      status = "OK" if pct >= threshold else "FAIL"
      print(f"[{status}] {path}: {pct:.1f}% (seuil {threshold:.0f}%)")
      if pct < threshold:
        failed = True

  return 1 if failed else 0


if __name__ == "__main__":
  raise SystemExit(main())
