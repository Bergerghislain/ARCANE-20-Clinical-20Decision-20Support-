#!/usr/bin/env sh
# Démarrage conteneur ARCANE :
#   1) applique le schéma via Alembic (source de vérité)
#   2) charge les seeds de démo (idempotents) si SEED_ON_START != "false"
#   3) lance l'API (qui sert aussi le SPA si dist/spa existe)
set -e

echo "[entrypoint] Migrations : alembic upgrade head ..."
cd /app/backend_fastapi
python -m alembic upgrade head
cd /app

if [ "${SEED_ON_START:-true}" != "false" ]; then
  echo "[entrypoint] Seeds : setup_database.sql ..."
  python backend_fastapi/scripts/apply_sql.py setup_database.sql
fi

echo "[entrypoint] Démarrage uvicorn ..."
exec python -m uvicorn backend_fastapi.app.main:app --host 0.0.0.0 --port 8000
