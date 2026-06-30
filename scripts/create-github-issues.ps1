# Crée labels + backlog issues GitHub (Windows / PowerShell)
# Prérequis : $env:GH_TOKEN ou gh auth login
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot\..

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

function New-ArcaneIssue([string]$Title, [string]$Body, [string[]]$Labels) {
  Write-Host "--- $Title"
  $args = @("issue", "create", "--title", $Title, "--body", $Body)
  foreach ($label in $Labels) { $args += @("--label", $label) }
  & gh @args
}

New-ArcaneIssue "[P0.1] ARGOS : API seule source de vérité pour l'historique" @"
## Contexte
Historique ARGOS en double persistance localStorage + API.

## Critères d'acceptation
- [ ] Plus de localStorage pour conversations ARGOS
- [ ] Chargement via GET /api/argos/discussions
- [ ] F5 = même historique
- [ ] Tests intégration router ARGOS

Voir docs/ROADMAP.md
"@ @("P0", "bug", "backend", "frontend", "testing")

New-ArcaneIssue "[P0.5] Aligner main avec l'état documenté (merge branches)" @"
## Critères d'acceptation
- [ ] main contient auth refresh, PatientFile découpé, ESLint/Ruff, ARGOS P0
- [ ] README et docs/PROJECT_STATE.md cohérents
- [ ] CI verte sur main
"@ @("P0", "chore")

New-ArcaneIssue "[P1.1] ARGOS : remplacer mockPatients par GET /api/patients" "Remplacer mockPatients dans ArgosSpace.tsx. Voir docs/KNOWN_GAPS.md" @("P1", "enhancement", "frontend")

New-ArcaneIssue "[P1.2] Profil patient : clarifier draft local vs synchronisation API" "Indicateurs UI brouillon/synchronisé. Voir ADR-006." @("P1", "ux", "frontend")

New-ArcaneIssue "[P1.3] Politique i18n : français prioritaire dans l'UI clinicien" "Inventaire chaînes EN + pages critiques en FR." @("P1", "documentation", "frontend")

New-ArcaneIssue "[P1.4] React Query pour l'état serveur frontend" "Cache patients, profil, clinical bundle, discussions ARGOS." @("P1", "enhancement", "frontend")

New-ArcaneIssue "[P1.5] Seuil couverture tests frontend en CI" "Seuil minimal client/lib + pages critiques." @("P1", "testing")

New-ArcaneIssue "[P1.6] E2E : ARGOS reload + profil autosave + admin assign" "Playwright : discussion ARGOS survit au F5." @("P1", "testing")

New-ArcaneIssue "[P1.7] Runbook LLM labo (openai_compatible / Qwen)" "Procédure pas-à-pas + variables .env documentées." @("P1", "documentation", "backend")

New-ArcaneIssue "[H2.1] Reset mot de passe (API + UI)" "ForgotPassword.tsx placeholder sans backend." @("H2", "enhancement", "backend", "frontend")

New-ArcaneIssue "[H2.2] Observabilité : health, logs structurés, métriques" "/health, /ready, logs JSON, latence API/LLM." @("H2", "backend")

New-ArcaneIssue "[H2.3] Traçabilité IA consultable par le clinicien" "UI ou export interactions IA (ai_audit.py)." @("H2", "enhancement")

Write-Host "`nIssues créées :"
gh issue list --limit 20
