#!/usr/bin/env python3
"""Applique un fichier .sql sur la base ARCANE via la connexion applicative.

Utile là où le client `psql` n'est pas disponible (Windows, image Docker
python-slim). La connexion et l'URL viennent de `app.settings` (mêmes variables
d'environnement que l'application).

Exemples (depuis la racine du dépôt) :
    python backend_fastapi/scripts/apply_sql.py backend_fastapi/sql/migrate_patient_profiles.sql
"""
from __future__ import annotations

import sys
from pathlib import Path

# Permet l'import de `backend_fastapi.app...` quel que soit le cwd.
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
  sys.path.insert(0, str(_REPO_ROOT))

from backend_fastapi.app import db  # noqa: E402


def apply_sql_file(path: Path) -> None:
  if not path.is_file():
    raise FileNotFoundError(f"Fichier SQL introuvable : {path}")

  sql = path.read_text(encoding="utf-8")
  conn = db.get_conn()
  try:
    cur = conn.cursor()
    try:
      # psycopg3 accepte plusieurs instructions dans un même execute()
      # tant qu'aucun paramètre n'est passé (cas des scripts SQL).
      cur.execute(sql)
    finally:
      cur.close()
    # `get_conn()` n'est pas garanti en autocommit selon le pool : on commit.
    conn.commit()
  finally:
    conn.close()


def main(argv: list[str]) -> int:
  if len(argv) != 2:
    print("Usage: python backend_fastapi/scripts/apply_sql.py <fichier.sql>", file=sys.stderr)
    return 2

  target = Path(argv[1])
  if not target.is_absolute():
    target = (_REPO_ROOT / target).resolve()

  print(f"Application du SQL : {target}")
  apply_sql_file(target)
  print("Terminé.")
  return 0


if __name__ == "__main__":
  raise SystemExit(main(sys.argv))
