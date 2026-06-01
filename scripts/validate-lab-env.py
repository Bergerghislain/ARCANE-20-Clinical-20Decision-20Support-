#!/usr/bin/env python3
"""Verifie la configuration labo/prod dans .env (sans afficher les secrets).

Usage (depuis la racine du depot) :
  python scripts/validate-lab-env.py
  python scripts/validate-lab-env.py --strict-https
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_CANDIDATES = (REPO_ROOT / "backend_fastapi" / ".env", REPO_ROOT / ".env")

PLACEHOLDER_JWT = {
  "change_me_dev_only",
  "remplacer_par_une_chaine_longue_aleatoire",
  "test_secret",
  "ci_test_jwt_secret_not_for_production_use_only",
}
MIN_JWT_LEN = 32


def _load_env_file(path: Path) -> dict[str, str]:
  data: dict[str, str] = {}
  if not path.is_file():
    return data
  for raw in path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#"):
      continue
    if "=" not in line:
      continue
    key, _, value = line.partition("=")
    data[key.strip()] = value.strip().strip('"').strip("'")
  return data


def _merged_env() -> dict[str, str]:
  merged: dict[str, str] = {}
  for path in ENV_CANDIDATES:
    merged.update(_load_env_file(path))
  for key, value in os.environ.items():
    if key.isupper():
      merged[key] = value
  return merged


def _as_bool(value: str | None) -> bool | None:
  if value is None:
    return None
  normalized = value.strip().lower()
  if normalized in {"1", "true", "yes", "on"}:
    return True
  if normalized in {"0", "false", "no", "off"}:
    return False
  return None


def main() -> int:
  parser = argparse.ArgumentParser(description="Validation configuration labo ARCANE")
  parser.add_argument(
    "--strict-https",
    action="store_true",
    help="Exige COOKIE_SECURE=true (deploiement HTTPS)",
  )
  args = parser.parse_args()

  env = _merged_env()
  errors: list[str] = []
  warnings: list[str] = []

  if not any(p.is_file() for p in ENV_CANDIDATES):
    errors.append(
      "Aucun fichier .env trouve. Copiez .env.example vers .env a la racine du depot."
    )

  jwt = env.get("JWT_SECRET", "")
  if not jwt:
    errors.append("JWT_SECRET manquant.")
  elif jwt in PLACEHOLDER_JWT:
    errors.append("JWT_SECRET est encore une valeur placeholder ou de test.")
  elif len(jwt) < MIN_JWT_LEN:
    errors.append(f"JWT_SECRET trop court (minimum recommande : {MIN_JWT_LEN} caracteres).")

  fallback = _as_bool(env.get("ALLOW_DEMO_PASSWORD_FALLBACK"))
  if fallback is None:
    warnings.append("ALLOW_DEMO_PASSWORD_FALLBACK non defini (defaut code : false).")
  elif fallback:
    errors.append(
      "ALLOW_DEMO_PASSWORD_FALLBACK=true : desactivez en labo/prod "
      "(mot de passe demo 'password' sur hashes factices)."
    )

  cookie_secure = _as_bool(env.get("COOKIE_SECURE"))
  if cookie_secure is None:
    warnings.append("COOKIE_SECURE non defini (defaut : false).")
  elif not cookie_secure:
    if args.strict_https:
      errors.append("COOKIE_SECURE=false alors que --strict-https est actif.")
    else:
      warnings.append(
        "COOKIE_SECURE=false : OK en dev HTTP local ; mettez true si le labo est en HTTPS."
      )

  cors = env.get("CORS_ORIGINS", "")
  if not cors.strip():
    errors.append("CORS_ORIGINS vide : le navigateur peut bloquer les appels API.")
  elif "*" in cors:
    errors.append("CORS_ORIGINS ne doit pas contenir '*' en labo/prod.")
  else:
    origins = [o.strip() for o in cors.split(",") if o.strip()]
    for origin in origins:
      if not re.match(r"^https?://", origin):
        warnings.append(f"CORS origin suspecte : {origin}")

  db_password = env.get("DB_PASSWORD", "")
  if db_password in {"", "postgres", "remplacer_mot_de_passe_fort"}:
    warnings.append("DB_PASSWORD faible ou placeholder.")

  print("=== Validation configuration labo ARCANE ===\n")
  print("Fichiers lus (ordre de surcharge) :")
  for path in ENV_CANDIDATES:
    status = "trouve" if path.is_file() else "absent"
    print(f"  - {path.relative_to(REPO_ROOT)} : {status}")
  print()

  if warnings:
    print("Avertissements :")
    for msg in warnings:
      print(f"  [WARN] {msg}")
    print()

  if errors:
    print("Erreurs :")
    for msg in errors:
      print(f"  [ERR]  {msg}")
    print("\nCorrigez .env puis relancez ce script.")
    return 1

  print("OK : configuration labo conforme aux controles automatiques.")
  print("Rappel : la CI utilise ses propres variables ; ce script valide VOTRE poste/serveur.")
  return 0


if __name__ == "__main__":
  sys.exit(main())
