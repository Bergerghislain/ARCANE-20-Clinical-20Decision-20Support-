# Initialise la base ARCANE (poste Windows) :
#   1) crée le schéma via Alembic (source de vérité)
#   2) charge les seeds de démo (idempotents)
#
# Pré-requis : base PostgreSQL existante + variables DB_* (voir .env / .env.example).
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "1/2 - Schema : alembic upgrade head ..."
Push-Location (Join-Path $RepoRoot "backend_fastapi")
try {
  python -m alembic upgrade head
} finally {
  Pop-Location
}

Write-Host "2/2 - Seeds : setup_database.sql ..."
python (Join-Path $RepoRoot "backend_fastapi\scripts\apply_sql.py") (Join-Path $RepoRoot "setup_database.sql")

Write-Host "Base initialisee (schema Alembic + seeds)."
