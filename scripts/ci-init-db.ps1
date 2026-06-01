# Initialise PostgreSQL pour les tests d'intégration ARCANE (poste Windows / cloud).
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SqlFile = Join-Path $RepoRoot "setup_database.sql"

$DbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { "arcane" }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = "postgres" }

if (-not (Test-Path $SqlFile)) {
  throw "Fichier introuvable: $SqlFile"
}

Write-Host "Application du schéma ARCANE sur ${DbUser}@${DbHost}:${DbPort}/${DbName} ..."
& psql -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $SqlFile
Write-Host "Base initialisée."
