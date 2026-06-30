#!/usr/bin/env bash
# Crée le backlog GitHub Issues depuis la roadmap ARCANE.
# Prérequis : gh auth login
# Usage : bash scripts/create-github-issues.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Erreur : GitHub CLI (gh) introuvable. Installez-le : https://cli.github.com/"
  exit 1
fi

echo "Création des labels (ignore si déjà existants)..."
for spec in \
  "P0:d73a4a:Critique - sprint actuel" \
  "P1:fbca04:Important - horizon 1-2 mois" \
  "H2:0e8a16:Pré-production" \
  "frontend:1d76db:Frontend React" \
  "backend:5319e7:Backend FastAPI" \
  "testing:bfdadc:Tests" \
  "documentation:0075ca:Documentation" \
  "ux:e99695:Expérience utilisateur" \
  "chore:ededed:Maintenance"; do
  IFS=':' read -r name color desc <<< "$spec"
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || true
done

create_issue() {
  local title="$1"
  local body="$2"
  shift 2
  local labels=("$@")
  local label_args=()
  for l in "${labels[@]}"; do label_args+=(--label "$l"); done
  echo "---"
  echo "Création : $title"
  gh issue create --title "$title" --body "$body" "${label_args[@]}"
}

create_issue \
  "[P0.1] ARGOS : API seule source de vérité pour l'historique" \
  "## Contexte
L'historique ARGOS était persisté en \`localStorage\` ET partiellement en API → divergence au rechargement (F5).

## Critères d'acceptation
- [ ] \`useArgosHistory\` ne lit/écrit plus \`argos_conversations\` dans localStorage
- [ ] Chargement initial via \`GET /api/argos/discussions\` + messages
- [ ] Création discussion patient via \`POST /api/argos/discussions\` avant affichage
- [ ] IDs conversation = \`conv_{discussionId}\`
- [ ] Tests intégration : créer → message → GET = historique intact
- [ ] F5 navigateur = même historique

## Fichiers concernés
- \`client/hooks/useArgosHistory.ts\`
- \`client/pages/ArgosSpace.tsx\`
- \`client/lib/argosMappers.ts\`
- \`backend_fastapi/tests/test_argos_router_integration.py\`

## Référence
docs/ROADMAP.md — Horizon 0" \
  P0 bug backend frontend testing

create_issue \
  "[P0.5] Aligner main avec l'état documenté (merge branches)" \
  "## Contexte
Plusieurs chantiers (auth refresh, PatientFile, tooling) peuvent exister sur des branches non mergées.

## Critères d'acceptation
- [ ] \`main\` contient auth refresh, PatientFile découpé, ESLint/Ruff
- [ ] README et docs/PROJECT_STATE.md cohérents avec le code
- [ ] CI verte sur main

## Référence
docs/ROADMAP.md" \
  P0 chore

create_issue \
  "[P1.1] ARGOS : remplacer mockPatients par GET /api/patients" \
  "## Contexte
\`ArgosSpace.tsx\` utilise une liste fictive de patients au lieu de l'API comme le Dashboard.

## Critères d'acceptation
- [ ] Sélecteur patient ARGOS charge depuis \`/api/patients\`
- [ ] Pagination ou limite documentée
- [ ] Tests mis à jour

## Référence
docs/KNOWN_GAPS.md" \
  P1 enhancement frontend

create_issue \
  "[P1.2] Profil patient : clarifier draft local vs synchronisation API" \
  "## Contexte
Le draft localStorage peut écraser silencieusement le profil API au chargement.

## Critères d'acceptation
- [ ] Badge ou indicateur « Brouillon local » / « Synchronisé »
- [ ] Comportement de priorité documenté et testé
- [ ] Pas d'écrasement silencieux non voulu

## Référence
docs/DECISIONS.md ADR-006" \
  P1 ux frontend

create_issue \
  "[P1.3] Politique i18n : français prioritaire dans l'UI clinicien" \
  "## Critères d'acceptation
- [ ] Inventaire des chaînes EN résiduelles
- [ ] Règle documentée dans FRONTEND_GUIDE.md
- [ ] Pages critiques (Dashboard, PatientFile, ARGOS) en FR cohérent" \
  P1 documentation frontend

create_issue \
  "[P1.4] React Query pour l'état serveur frontend" \
  "## Contexte
Chargements manuels dispersés, pas de cache unifié.

## Critères d'acceptation
- [ ] Patients, profil, clinical bundle, discussions ARGOS via couche cache
- [ ] Invalidation après mutations
- [ ] Pattern documenté dans FRONTEND_GUIDE.md" \
  P1 enhancement frontend

create_issue \
  "[P1.5] Seuil couverture tests frontend en CI" \
  "## Critères d'acceptation
- [ ] Seuil minimal sur \`client/lib/\` et pages critiques
- [ ] Job CI échoue si régression
- [ ] Documenté dans CONTRIBUTING.md" \
  P1 testing

create_issue \
  "[P1.6] E2E : ARGOS reload + profil autosave + admin assign" \
  "## Critères d'acceptation
- [ ] Playwright : discussion ARGOS survit au F5
- [ ] Playwright : brouillon profil visible après reload (si applicable)
- [ ] Playwright : admin assign patient (optionnel)

## Fichiers
e2e/*.spec.ts" \
  P1 testing

create_issue \
  "[P1.7] Runbook LLM labo (openai_compatible / Qwen)" \
  "## Critères d'acceptation
- [ ] Procédure pas-à-pas dans docs/
- [ ] Variables .env documentées
- [ ] Validation manuelle : rapport + ARGOS avec LLM réel" \
  P1 documentation backend

create_issue \
  "[H2.1] Reset mot de passe (API + UI)" \
  "## Contexte
\`ForgotPassword.tsx\` est un placeholder sans backend.

## Critères d'acceptation
- [ ] Endpoint sécurisé (token email ou procédure labo)
- [ ] UI fonctionnelle
- [ ] Tests" \
  H2 enhancement backend frontend

create_issue \
  "[H2.2] Observabilité : health, logs structurés, métriques" \
  "## Critères d'acceptation
- [ ] \`/health\` et \`/ready\`
- [ ] Logs JSON en prod
- [ ] Latence API / LLM mesurable" \
  H2 backend

create_issue \
  "[H2.3] Traçabilité IA consultable par le clinicien" \
  "## Critères d'acceptation
- [ ] UI ou export des interactions IA (version prompt, hash, réponse)
- [ ] Aligné sur ai_audit.py existant" \
  H2 enhancement

echo ""
echo "Terminé. Liste des issues :"
gh issue list --limit 20
