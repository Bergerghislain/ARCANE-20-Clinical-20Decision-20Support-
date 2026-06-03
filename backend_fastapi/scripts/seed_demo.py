#!/usr/bin/env python3
"""Seed des comptes et patients de démonstration ARCANE.

Différence clé avec l'ancien `setup_database.sql` : les utilisateurs sont créés
avec un **vrai hash bcrypt** (calculé ici via le même contexte que l'application),
ce qui supprime toute dépendance au "mot de passe démo" (`ALLOW_DEMO_PASSWORD_FALLBACK`).

- Mot de passe : variable d'env `SEED_DEMO_PASSWORD` (défaut : "password" pour dev/CI).
- Idempotent ET auto-réparateur : un `ON CONFLICT` met à jour le hash, ce qui
  corrige aussi une base héritée des anciens hashes factices.
- À lancer APRÈS `alembic upgrade head`.

Usage (depuis la racine du dépôt) :
    python backend_fastapi/scripts/seed_demo.py
    SEED_DEMO_PASSWORD='un_mot_de_passe_fort' python backend_fastapi/scripts/seed_demo.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
  sys.path.insert(0, str(_REPO_ROOT))

from backend_fastapi.app import db  # noqa: E402
from backend_fastapi.app.security import pwd_context  # noqa: E402

DEMO_PASSWORD = os.getenv("SEED_DEMO_PASSWORD", "password")

# (username, email, role, full_name, is_active)
DEMO_USERS = [
  ("admin", "admin@arcane.com", "admin", "Administrateur System", True),
  ("dr.martin", "martin@hospital.com", "clinician", "Dr Martin Dupont", True),
  ("dr.leclerc", "leclerc@hospital.com", "clinician", "Dr Lea Leclerc", True),
  ("researcher.jane", "jane@research.com", "researcher", "Jane Doe", True),
  ("pending.clin1", "pending1@arcane.com", "clinician", "Dr Pending One", False),
  ("pending.clin2", "pending2@arcane.com", "clinician", "Dr Pending Two", False),
  ("disabled.clin", "disabled@arcane.com", "clinician", "Dr Disabled", False),
]

# (name, ipp, year, month, sex, created_by_email, assigned_clinician_email)
DEMO_PATIENTS = [
  ("Jean Dupont", "PAT001", 1960, 5, "MALE", "admin@arcane.com", "martin@hospital.com"),
  ("Marie Curie", "PAT002", 1975, 8, "FEMALE", "admin@arcane.com", "martin@hospital.com"),
  ("Pierre Martin", "PAT003", 1955, 2, "MALE", "martin@hospital.com", "leclerc@hospital.com"),
  ("Sophie Bernard", "PAT004", 1982, 11, "FEMALE", "martin@hospital.com", "leclerc@hospital.com"),
]


def seed() -> None:
  password_hash = pwd_context.hash(DEMO_PASSWORD)
  conn = db.get_conn()
  try:
    cur = conn.cursor()
    try:
      for username, email, role, full_name, is_active in DEMO_USERS:
        cur.execute(
          """
          INSERT INTO users (username, email, password_hash, role, full_name, is_active)
          VALUES (%s, %s, %s, %s, %s, %s)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            is_active = EXCLUDED.is_active
          """,
          (username, email, password_hash, role, full_name, is_active),
        )

      emails = [u[1] for u in DEMO_USERS]
      cur.execute("SELECT id, email FROM users WHERE email = ANY(%s)", (emails,))
      id_by_email = {email: uid for (uid, email) in cur.fetchall()}

      for name, ipp, year, month, sex, created_email, assigned_email in DEMO_PATIENTS:
        created_by = id_by_email.get(created_email)
        assigned = id_by_email.get(assigned_email)
        if assigned is None:
          raise RuntimeError(f"Clinicien assigné introuvable pour {ipp}: {assigned_email}")
        cur.execute(
          """
          INSERT INTO patients (
            name, ipp, birth_date_year, birth_date_month, birth_date,
            birth_date_precision, sex, created_by, updated_by, assigned_clinician_id
          )
          VALUES (%s, %s, %s, %s, make_date(%s, %s, 1), 'month', %s, %s, %s, %s)
          ON CONFLICT (ipp) DO NOTHING
          """,
          (name, ipp, year, month, year, month, sex, created_by, created_by, assigned),
        )
    finally:
      cur.close()
    # `get_conn()` n'est pas garanti en autocommit selon le pool : on commit.
    conn.commit()
  finally:
    conn.close()

  source = "SEED_DEMO_PASSWORD" if os.getenv("SEED_DEMO_PASSWORD") else "valeur par défaut 'password'"
  print(f"Seeds appliqués : {len(DEMO_USERS)} users (hash bcrypt réel via {source}), {len(DEMO_PATIENTS)} patients.")


if __name__ == "__main__":
  seed()
