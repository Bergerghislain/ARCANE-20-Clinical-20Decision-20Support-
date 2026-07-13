# Crée les issues GitHub du backlog hospitalier (docs/GITHUB_ISSUES_HOSPITAL.md).
# Prérequis : gh auth login
$ErrorActionPreference = "Stop"

$issues = @(
  @{
    Title = "test(e2e): couvrir autosave profil, admin assign et reload ARGOS"
    Labels = "p1,testing"
    Body = @"
## Contexte
La CI exécute 3 specs Playwright (ARGOS flow, auth session). Les parcours métier critiques ne sont pas tous couverts.

## Objectif
Éviter les régressions avant pilote hospitalier.

## Critères d'acceptation
- [ ] E2E : édition profil patient → reload → données persistées (API)
- [ ] E2E : admin réaffecte un patient → visible dashboard clinicien cible
- [ ] E2E : discussion ARGOS survit au F5 (maintenir vert)
- [ ] Documentation dans docs/ONBOARDING.md

## Référence
docs/HOSPITAL_READINESS.md — pilier 1
"@
  },
  @{
    Title = "ci(frontend): seuil de couverture Vitest sur lib/ et pages critiques"
    Labels = "p1,testing"
    Body = @"
## Contexte
Le backend a un seuil de couverture (65 %). Le frontend n'en a pas.

## Critères d'acceptation
- [ ] Seuil CI sur client/lib/ et pages critiques
- [ ] Mise à jour docs/KNOWN_GAPS.md

## Référence
docs/ROADMAP.md — Horizon 1
"@
  },
  @{
    Title = "feat(patient): badge brouillon / synchronisé pour le profil patient"
    Labels = "p1,ux"
    Body = @"
## Contexte
Draft localStorage + API sans indicateur clair pour le clinicien.

## Critères d'acceptation
- [ ] Badge Brouillon | Synchronisé | Erreur
- [ ] Texte ADR-006 dans PatientInfosTab

## Référence
docs/KNOWN_GAPS.md
"@
  },
  @{
    Title = "feat(ai): indicateur UI « réponse simulée » vs « IA connectée »"
    Labels = "p1,ai"
    Body = @"
## Critères d'acceptation
- [ ] Bandeau Report + ARGOS selon GET /api/ai/status
- [ ] mock_json = libellé simulation explicite

## Référence
docs/HOSPITAL_READINESS.md
"@
  },
  @{
    Title = "feat(ops): logs JSON, /health, /ready et métriques latence API"
    Labels = "h2,hospital,observability"
    Body = @"
## Critères d'acceptation
- [ ] Logs JSON + request_id
- [ ] /health et /ready
- [ ] Métriques latence et 5xx
- [ ] Runbook incident

## Référence
docs/HOSPITAL_READINESS.md — pilier 3
"@
  },
  @{
    Title = "feat(ops): pipeline déploiement versionné staging puis production"
    Labels = "h2,hospital,devops"
    Body = @"
## Critères d'acceptation
- [ ] Build → staging → smoke → prod
- [ ] Images Docker taguées par SHA
- [ ] validate-lab-env au démarrage

## Référence
docs/LABO_SECURITY.md
"@
  },
  @{
    Title = "docs(ops): runbooks backup PostgreSQL, restore et disaster recovery"
    Labels = "h2,hospital,documentation"
    Body = @"
## Critères d'acceptation
- [ ] Backup automatisé + restore testé
- [ ] RTO/RPO indicatifs pilote

## Référence
docs/KNOWN_GAPS.md
"@
  },
  @{
    Title = "feat(auth): reset mot de passe et révocation refresh tokens"
    Labels = "h2,hospital,security"
    Body = @"
## Critères d'acceptation
- [ ] API reset MDP
- [ ] Révocation refresh tokens
- [ ] Tests pytest

## Référence
docs/KNOWN_GAPS.md — sécurité
"@
  },
  @{
    Title = "feat(auth): SSO OIDC/SAML et MFA pour déploiement DSI"
    Labels = "h3,hospital,security"
    Body = @"
## Critères d'acceptation
- [ ] OIDC configurable
- [ ] MFA ou délégation IdP
- [ ] Mapping rôles

## Référence
docs/ROADMAP.md — Horizon 3
"@
  },
  @{
    Title = "docs(compliance): registre RGPD, DPIA IA et checklist HDS"
    Labels = "h3,hospital,compliance"
    Body = @"
## Critères d'acceptation
- [ ] Registre traitements
- [ ] DPIA simplifiée
- [ ] Checklist HDS

## Référence
docs/HOSPITAL_READINESS.md — pilier 5
"@
  },
  @{
    Title = "perf(api): tests de charge et SLO latence (P95) routes critiques"
    Labels = "h2,performance"
    Body = @"
## Critères d'acceptation
- [ ] k6/Locust scénarios critiques
- [ ] SLO documentés
- [ ] Index SQL si N+1

## Référence
docs/HOSPITAL_READINESS.md — pilier 4
"@
  },
  @{
    Title = "perf(frontend): code splitting, lazy routes et audit bundle Vite"
    Labels = "h2,performance"
    Body = @"
## Critères d'acceptation
- [ ] React.lazy routes lourdes
- [ ] Budget bundle CI
- [ ] Prefetch React Query

## Référence
docs/HOSPITAL_READINESS.md — pilier 4
"@
  },
  @{
    Title = "feat(api): rate limiting, pooling DB et durcissement circuit breaker LLM"
    Labels = "h2,performance,security"
    Body = @"
## Critères d'acceptation
- [ ] Rate limit login et /api/ai/*
- [ ] Doc pooling prod
- [ ] Tests rate limit

## Référence
llm_resilience.py
"@
  },
  @{
    Title = "feat(ai): journal consultable des inférences (prompt, modèle, utilisateur)"
    Labels = "h2,hospital,ai"
    Body = @"
## Critères d'acceptation
- [ ] Log structuré inférences
- [ ] Endpoint admin lecture
- [ ] Rétention configurable

## Référence
docs/ROADMAP.md — traçabilité IA
"@
  },
  @{
    Title = "feat(integration): lecture FHIR Patient/Observation et tenancy multi-site"
    Labels = "h3,hospital,integration"
    Body = @"
## Critères d'acceptation
- [ ] Spike FHIR R4 lecture
- [ ] site_id + RBAC par établissement
- [ ] ADR intégration

## Référence
docs/ROADMAP.md — Horizon 3
"@
  },
  @{
    Title = "feat(argos): feedback clinicien et jeu de cas cliniques de référence"
    Labels = "h2,ai,quality"
    Body = @"
## Critères d'acceptation
- [ ] Thumbs up/down persistés
- [ ] 10+ cas référence + scoring

## Référence
docs/ROADMAP.md
"@
  }
)

foreach ($issue in $issues) {
  Write-Host "Création: $($issue.Title)"
  gh issue create --title $issue.Title --body $issue.Body --label $issue.Labels
}

Write-Host "Terminé. Voir docs/GITHUB_ISSUES_HOSPITAL.md pour le détail."
