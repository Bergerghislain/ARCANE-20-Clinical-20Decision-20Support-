# Backlog issues GitHub — déploiement hospitalier & performance

Création automatique : `powershell -File scripts/create-hospital-issues.ps1` (nécessite `gh auth login`).

Labels suggérés : `hospital`, `performance`, `security`, `compliance`, `p1`, `h2`, `h3`.

---

## Issue 1 — E2E parcours clinique complet

**Titre** : `test(e2e): couvrir autosave profil, admin assign et reload ARGOS`

**Labels** : `p1`, `testing`

**Corps** :

```markdown
## Contexte
La CI exécute 3 specs Playwright (ARGOS flow, auth session). Les parcours métier critiques ne sont pas tous couverts.

## Objectif
Éviter les régressions avant pilote hospitalier.

## Critères d'acceptation
- [ ] E2E : édition profil patient → reload → données persistées (API)
- [ ] E2E : admin réaffecte un patient → visible dashboard clinicien cible
- [ ] E2E : discussion ARGOS survit au F5 (déjà en place — maintenir vert)
- [ ] Documentation dans `docs/ONBOARDING.md` (section tests E2E)

## Référence
docs/HOSPITAL_READINESS.md — pilier 1
```

---

## Issue 2 — Seuil couverture frontend CI

**Titre** : `ci(frontend): seuil de couverture Vitest sur lib/ et pages critiques`

**Labels** : `p1`, `testing`

**Corps** :

```markdown
## Contexte
Le backend a un seuil de couverture (65 %). Le frontend n'en a pas — régressions UI probables.

## Objectif
Bloquer les PR qui cassent les modules critiques sans test.

## Critères d'acceptation
- [ ] Seuil CI sur `client/lib/` et pages : Dashboard, PatientFile, ArgosSpace, Login
- [ ] Rapport couverture dans artifact CI ou commentaire PR
- [ ] Mise à jour `docs/KNOWN_GAPS.md`

## Référence
docs/ROADMAP.md — Horizon 1
```

---

## Issue 3 — UX sync profil patient (ADR-006)

**Titre** : `feat(patient): badge brouillon / synchronisé pour le profil patient`

**Labels** : `p1`, `ux`

**Corps** :

```markdown
## Contexte
Le profil patient utilise un draft `localStorage` + API. Le clinicien ne voit pas clairement l'état de sync.

## Objectif
Réduire le risque de confusion sur poste partagé et en pilote.

## Critères d'acceptation
- [ ] Badge visible : Brouillon local | Synchronisé | Erreur sync
- [ ] Texte d'aide dans PatientInfosTab (ADR-006)
- [ ] Test Vitest ou E2E sur le badge

## Référence
docs/KNOWN_GAPS.md — cohérence produit
```

---

## Issue 4 — Indicateur mock vs IA réelle

**Titre** : `feat(ai): indicateur UI « réponse simulée » vs « IA connectée »`

**Labels** : `p1`, `ai`

**Corps** :

```markdown
## Contexte
`LLM_PROVIDER=mock_json` et fallback frontend peuvent donner l'impression d'une vraie IA.

## Objectif
Transparence clinique obligatoire avant déploiement.

## Critères d'acceptation
- [ ] Bandeau ou badge dans Report + ARGOS selon `GET /api/ai/status`
- [ ] `mock_json` / `disabled` = libellé « simulation » explicite
- [ ] Doc `.env.example` + LABO_SECURITY

## Référence
docs/HOSPITAL_READINESS.md — pilier 1
```

---

## Issue 5 — Observabilité production

**Titre** : `feat(ops): logs JSON, /health, /ready et métriques latence API`

**Labels** : `h2`, `hospital`, `observability`

**Corps** :

```markdown
## Contexte
Aucune observabilité exploitable en prod aujourd'hui (score prod 3/10).

## Objectif
Permettre au N2 hôpital de diagnostiquer incidents sans développeur.

## Critères d'acceptation
- [ ] Logs structurés JSON avec `request_id`
- [ ] `GET /health` (process up) et `GET /ready` (PostgreSQL OK)
- [ ] Métriques Prometheus ou équivalent : latence routes, taux 5xx
- [ ] Doc runbook incident dans `docs/`

## Référence
docs/HOSPITAL_READINESS.md — pilier 3
```

---

## Issue 6 — Pipeline déploiement staging → prod

**Titre** : `feat(ops): pipeline déploiement versionné staging puis production`

**Labels** : `h2`, `hospital`, `devops`

**Corps** :

```markdown
## Contexte
Déploiement labo documenté (Docker, `pnpm run start`) mais pas de promotion versionnée.

## Objectif
Reproductibilité et rollback pour DSI.

## Critères d'acceptation
- [ ] Workflow GitHub Actions ou script : build → deploy staging → smoke → prod
- [ ] Images Docker taguées par commit SHA
- [ ] Variables d'env validées au démarrage (`validate-lab-env.py`)
- [ ] Checklist dans `docs/HOSPITAL_READINESS.md`

## Référence
docs/LABO_SECURITY.md
```

---

## Issue 7 — Backup, restore et runbooks

**Titre** : `docs(ops): runbooks backup PostgreSQL, restore et disaster recovery`

**Labels** : `h2`, `hospital`, `documentation`

**Corps** :

```markdown
## Contexte
Pas de procédure backup/restore dans le dépôt.

## Objectif
Exigence minimale hôpital avant données patients réelles.

## Critères d'acceptation
- [ ] Runbook backup automatisé (pg_dump + rétention)
- [ ] Procédure restore testée (documentée)
- [ ] RTO/RPO indicatifs pour pilote
- [ ] Script optionnel dans `scripts/`

## Référence
docs/KNOWN_GAPS.md — données & migrations
```

---

## Issue 8 — Sécurité sessions (reset MDP, refresh tokens)

**Titre** : `feat(auth): reset mot de passe et révocation refresh tokens`

**Labels** : `h2`, `hospital`, `security`

**Corps** :

```markdown
## Contexte
ForgotPassword = placeholder. Refresh tokens non révocables finement.

## Objectif
Niveau sécurité attendu en environnement clinique.

## Critères d'acceptation
- [ ] API reset mot de passe (token e-mail ou procédure admin documentée)
- [ ] Table ou mécanisme révocation refresh (logout all devices)
- [ ] Tests pytest + mise à jour `docs/LABO_SECURITY.md`

## Référence
docs/KNOWN_GAPS.md — sécurité H1/H2
```

---

## Issue 9 — SSO et MFA

**Titre** : `feat(auth): SSO OIDC/SAML et MFA pour déploiement DSI`

**Labels** : `h3`, `hospital`, `security`

**Corps** :

```markdown
## Contexte
Authentification locale uniquement. Les hôpitaux exigent souvent SSO + MFA.

## Objectif
Prérequis IT pour déploiement multi-services.

## Critères d'acceptation
- [ ] Provider OIDC configurable (Keycloak/Azure AD test)
- [ ] MFA TOTP ou délégation au IdP
- [ ] Mapping rôles ARCANE ← groupes IdP
- [ ] Doc intégration DSI

## Référence
docs/ROADMAP.md — Horizon 3
```

---

## Issue 10 — Conformité RGPD et HDS

**Titre** : `docs(compliance): registre RGPD, DPIA IA et checklist HDS`

**Labels** : `h3`, `hospital`, `compliance`

**Corps** :

```markdown
## Contexte
Pas de documentation conformité dans le repo.

## Objectif
Dossier pour commission données / achat.

## Critères d'acceptation
- [ ] Registre des traitements (données patient, logs IA, activity_logs)
- [ ] DPIA simplifiée (aide à la décision, LLM, rétention)
- [ ] Checklist hébergement HDS (France) ou équivalent
- [ ] Politique rétention logs et messages ARGOS

## Référence
docs/HOSPITAL_READINESS.md — pilier 5
```

---

## Issue 11 — Tests de charge et SLO performance

**Titre** : `perf(api): tests de charge et SLO latence (P95) routes critiques`

**Labels** : `h2`, `performance`

**Corps** :

```markdown
## Contexte
Aucun test de charge — risque avant pilote 10+ utilisateurs simultanés.

## Objectif
Performance comparable aux apps métier (API P95 < 500 ms hors LLM).

## Critères d'acceptation
- [ ] Scénarios k6/Locust : login, liste patients, ARGOS messages
- [ ] SLO documentés dans `docs/HOSPITAL_READINESS.md`
- [ ] Job CI optionnel (smoke load) ou doc exécution manuelle
- [ ] Correctifs index SQL si N+1 identifiés

## Référence
docs/HOSPITAL_READINESS.md — pilier 4
```

---

## Issue 12 — Optimisation frontend (bundle, lazy routes)

**Titre** : `perf(frontend): code splitting, lazy routes et audit bundle Vite`

**Labels** : `h2`, `performance`

**Corps** :

```markdown
## Contexte
SPA monolithique — TTI et taille bundle non optimisés pour postes hospitaliers.

## Objectif
Chargement initial < 3 s sur réseau hôpital typique.

## Critères d'acceptation
- [ ] `React.lazy` sur routes admin et pages lourdes
- [ ] Rapport `vite build --analyze` documenté
- [ ] Prefetch React Query : patient list → dossier
- [ ] Lighthouse CI ou budget taille bundle en CI

## Référence
docs/HOSPITAL_READINESS.md — pilier 4
```

---

## Issue 13 — Rate limiting et résilience API

**Titre** : `feat(api): rate limiting, pooling DB et durcissement circuit breaker LLM`

**Labels** : `h2`, `performance`, `security`

**Corps** :

```markdown
## Contexte
Pas de rate limiting. Pooling DB non documenté pour prod.

## Objectif
Résilience sous charge et protection abus (auth, IA).

## Critères d'acceptation
- [ ] Rate limit sur login, `/api/ai/*`, création discussions
- [ ] Doc PgBouncer ou pool SQLAlchemy/psycopg prod
- [ ] Timeouts LLM et circuit breaker documentés pour ops
- [ ] Tests unitaires sur rate limit

## Référence
backend_fastapi — llm_resilience.py
```

---

## Issue 14 — Traçabilité IA consultable

**Titre** : `feat(ai): journal consultable des inférences (prompt, modèle, utilisateur)`

**Labels** : `h2`, `hospital`, `ai`

**Corps** :

```markdown
## Contexte
Audit IA côté backend existe partiellement ; pas d'UI ni export pour conformité.

## Objectif
Traçabilité exigée pour IA en contexte clinique.

## Critères d'acceptation
- [ ] Enregistrement : user_id, patient_id, modèle, hash entrée, timestamp
- [ ] Endpoint admin lecture + filtres date/utilisateur
- [ ] Rétention configurable
- [ ] Tests intégration

## Référence
docs/ROADMAP.md — Horizon 2 traçabilité IA
```

---

## Issue 15 — Intégration FHIR et multi-établissement

**Titre** : `feat(integration): lecture FHIR Patient/Observation et tenancy multi-site`

**Labels** : `h3`, `hospital`, `integration`

**Corps** :

```markdown
## Contexte
Pas d'intégration SI hospitalier. Patients saisis manuellement ou import JSON.

## Objectif
Préparer l'interopérabilité DPI (phase lecture).

## Critères d'acceptation
- [ ] Spike FHIR R4 : import Patient + Observation depuis serveur test
- [ ] Champ `site_id` ou équivalent sur patients et logs
- [ ] RBAC filtré par établissement
- [ ] ADR architecture intégration

## Référence
docs/ROADMAP.md — Horizon 3
```

---

## Issue 16 — Qualité IA et feedback clinicien

**Titre** : `feat(argos): feedback clinicien et jeu de cas cliniques de référence`

**Labels** : `h2`, `ai`, `quality`

**Corps** :

```markdown
## Contexte
Pas d'évaluation systématique des réponses ARGOS / rapports.

## Objectif
Amélioration continue avant généralisation hôpital.

## Critères d'acceptation
- [ ] Thumbs up/down ARGOS persistés (activity_logs ou table dédiée)
- [ ] 10+ cas cliniques de référence avec scoring automatique ou manuel
- [ ] Rapport qualité exportable pour revue médicale

## Référence
docs/ROADMAP.md — Horizon 1 feedback + Horizon 2 qualité IA
```
