# PowerShell — créer les issues GitHub (équivalent de create-github-issues.sh)
# Prérequis : gh auth login
# Usage : powershell -File scripts/create-github-issues.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) introuvable. Installez-le : https://cli.github.com/"
}

$labels = @(
  @{ name = "P0"; color = "d73a4a"; desc = "Critique - sprint actuel" },
  @{ name = "P1"; color = "fbca04"; desc = "Important - horizon 1-2 mois" },
  @{ name = "H2"; color = "0e8a16"; desc = "Pré-production" },
  @{ name = "frontend"; color = "1d76db"; desc = "Frontend React" },
  @{ name = "backend"; color = "5319e7"; desc = "Backend FastAPI" },
  @{ name = "testing"; color = "bfdadc"; desc = "Tests" },
  @{ name = "documentation"; color = "0075ca"; desc = "Documentation" },
  @{ name = "ux"; color = "e99695"; desc = "Expérience utilisateur" },
  @{ name = "chore"; color = "ededed"; desc = "Maintenance" },
  @{ name = "bug"; color = "d73a4a"; desc = "Bug" },
  @{ name = "enhancement"; color = "a2eeef"; desc = "Amélioration" }
)

foreach ($l in $labels) {
  gh label create $l.name --color $l.color --description $l.desc 2>$null
}

function New-ArcaneIssue {
  param(
    [string]$Title,
    [string]$Body,
    [string[]]$Labels
  )
  Write-Host "--- Création : $Title"
  $labelArgs = $Labels | ForEach-Object { "--label", $_ }
  & gh issue create --title $Title --body $Body @labelArgs
}

New-ArcaneIssue -Title "[P0.1] ARGOS : API seule source de vérité pour l'historique" -Labels @("P0","bug","backend","frontend","testing") -Body @"
## Contexte
Historique ARGOS en double persistance localStorage + API.

## Critères d'acceptation
- [ ] Plus de localStorage pour conversations ARGOS
- [ ] Chargement via API au montage
- [ ] F5 = même historique
- [ ] Tests intégration router ARGOS

Voir docs/ROADMAP.md
"@

New-ArcaneIssue -Title "[P1.1] ARGOS : brancher GET /api/patients" -Labels @("P1","enhancement","frontend") -Body "Remplacer mockPatients dans ArgosSpace.tsx. Voir docs/KNOWN_GAPS.md"

New-ArcaneIssue -Title "[P1.2] Profil patient : draft vs sync API" -Labels @("P1","ux","frontend") -Body "Indicateurs UI brouillon/synchronisé. Voir ADR-006."

Write-Host "`nIssues créées. Liste :"
gh issue list --limit 15
