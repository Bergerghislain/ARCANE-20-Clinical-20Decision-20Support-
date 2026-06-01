#!/usr/bin/env bash
# Initialise la base PostgreSQL pour les tests d'intégration (CI ou poste local).
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-arcane}"
export PGPASSWORD="${DB_PASSWORD:-postgres}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="${REPO_ROOT}/setup_database.sql"

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Fichier introuvable: ${SQL_FILE}" >&2
  exit 1
fi

echo "Application du schéma ARCANE sur ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME} ..."
psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SQL_FILE}"
echo "Base initialisée."
