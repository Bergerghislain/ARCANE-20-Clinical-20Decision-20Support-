#!/usr/bin/env bash
# Initialise la base ARCANE (poste local / cloud) :
#   1) crée le schéma via Alembic (source de vérité)
#   2) charge les seeds de démo (idempotents)
#
# Pré-requis : base PostgreSQL existante + variables DB_* (voir .env / .env.example).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "1/2 - Schéma : alembic upgrade head ..."
( cd "${REPO_ROOT}/backend_fastapi" && python -m alembic upgrade head )

echo "2/2 - Seeds : setup_database.sql ..."
python "${REPO_ROOT}/backend_fastapi/scripts/apply_sql.py" "${REPO_ROOT}/setup_database.sql"

echo "Base initialisée (schéma Alembic + seeds)."
