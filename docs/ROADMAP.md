# Roadmap produit & technique ARCANE

Document de pilotage (vision PO / tech lead).  
**Dernière révision** : juillet 2026 — à recalibrer chaque fin de sprint.

## Vision

Offrir aux équipes soignantes un **espace unique** pour consulter le dossier patient, obtenir une **synthèse IA traçable** et mener des **discussions ARGOS** persistantes — avec un niveau de fiabilité compatible avec un **pilote hospitalier**, puis une **mise en production** aux standards de performance des applications métier à grande échelle.

**Préparation déploiement hôpital** : [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md)

## Maturité actuelle (estimation)

| Dimension | Score | Cible 6 mois |
|-----------|-------|--------------|
| Architecture backend | 7/10 | 8/10 |
| Données & migrations | 7/10 | 8/10 |
| Sécurité | 6/10 | 7,5/10 |
| Tests & CI | 6,5/10 | 8/10 |
| Frontend | **~5,5/10** | 7/10 |
| Prod / entreprise | 3/10 | 6/10 |
| Performance | 4/10 | 7/10 |
| Cohérence produit | **~6/10** | 7,5/10 |
| **Global** | **~6/10** | **~7,5/10** |

---

## Principes de priorisation

1. **Fiabilité des données utilisateur** avant nouvelles features.
2. **Une source de vérité** par domaine (pas de double persistance client/serveur).
3. **Tests sur les parcours cliniques** avant élargissement UI.
4. **Observabilité et performance mesurée** avant pilote multi-utilisateurs.
5. **Conformité DSI** (SSO, HDS) avant généralisation hôpital.

---

## Horizon 0 — Stabilisation (terminé sur `main`)

| ID | Thème | Statut | Critère de done |
|----|-------|--------|-----------------|
| **P0.1** | ARGOS : API seule source de vérité historique | 🟢 Fait | Plus de `localStorage` conversations |
| **P0.2** | Auth : refresh automatique session | 🟢 Fait | Pas de déconnexion surprise 15–30 min |
| **P0.3** | PatientFile : découpage phase 1 | 🟢 Fait | Orchestrateur < 400 lignes |
| **P0.4** | Outillage : ESLint, Ruff, `strictNullChecks` | 🟢 Fait | CI verte avec linters |
| **P0.5** | Aligner `main` avec l'état documenté | 🟢 Fait | Doc à jour |

---

## Horizon 1 — Produit labo fiable (en cours)

Objectif : un clinicien peut utiliser ARCANE **quotidiennement** sur des vrais patients seeds (puis pilote).

### P1 — Cohérence produit

| Item | Description | Statut | Effort |
|------|-------------|--------|--------|
| **ARGOS ↔ patients réels** | `useArgosPatients` + `GET /api/patients` | 🟢 Fait | — |
| **ARGOS F5 session** | `sessionStorage` + restauration post-sync API | 🟢 Fait | — |
| **ARGOS qualité chat** | Contexte invisible, filtrage JSON, i18n FR | 🟢 Fait | — |
| **Discussions générales ARGOS** | Persister API ou retirer UX `local_*` | 🔴 À trancher | S |
| **Profil patient : draft vs API** | Badge brouillon / synchronisé + ADR-006 | 🟢 Fait | — |
| **i18n pages critiques** | `fr.ts` + layout | 🟢 Fait | — |
| **Indicateur mock vs IA** | Bandeau selon `/api/ai/status` | 🔴 À faire | S |

### P1 — Frontend discipline

| Item | Description | Statut | Effort |
|------|-------------|--------|--------|
| **React Query** | Cache patients, profil, bundle, ARGOS | 🟢 Fait | — |
| **Couverture tests frontend** | Seuil CI `lib/` + pages critiques | 🔴 À faire | M |
| **E2E élargis** | Autosave profil, admin assign, ARGOS F5 | 🟡 Partiel (F5) | M |
| **PatientFile phase 2** | Découper `usePatientReport` | 🔴 À faire | M |

### P1 — IA utilisable en labo

| Item | Description | Statut | Effort |
|------|-------------|--------|--------|
| **LLM labo documenté** | Ollama/Groq/mock dans `.env.example` | 🟢 Fait | — |
| **Status LLM API** | `GET /api/ai/status` | 🟢 Fait | — |
| **Bascule mock → réel** | Interdire mock silencieux en démo clinique | 🔴 À faire | S |
| **Feedback clinicien** | Thumbs ARGOS → logs ou table dédiée | 🔴 À faire | M |

---

## Horizon 2 — Pré-production clinique (3–6 mois)

Objectif : pilote restreint (5–10 cliniciens) avec exploitation N2.

| Domaine | Initiatives | Issue backlog |
|---------|-------------|---------------|
| **Sécurité** | Reset MDP ; rotation JWT ; révocation refresh | #8 |
| **Observabilité** | Logs JSON ; `/health` + `/ready` ; métriques | #5 |
| **Déploiement** | Pipeline staging → prod ; Docker tagué | #6 |
| **Résilience** | Backup/restore runbooks | #7 |
| **Performance** | Tests charge k6 ; SLO P95 ; rate limiting | #11, #13 |
| **Frontend perf** | Lazy routes ; budget bundle | #12 |
| **Données cliniques** | Écriture complète UI bundle clinique | backlog |
| **Traçabilité IA** | Journal consultable inférences | #14 |
| **Qualité IA** | Cas cliniques référence + scoring | #16 |

---

## Horizon 3 — Entreprise / hôpital (6–12 mois)

| Initiative | Notes | Issue backlog |
|------------|-------|---------------|
| SSO (OIDC / SAML) | Prérequis DSI | #9 |
| MFA | TOTP ou IdP | #9 |
| Hébergement HDS (France) | Architecture + logs | #10 |
| Multi-établissement | `site_id`, RBAC par site | #15 |
| Intégration DPI / HL7 FHIR | Lecture puis écriture | #15 |
| Conformité RGPD | Registre, DPIA, rétention | #10 |

---

## Performance — objectifs « grande app »

| Métrique | Cible pilote | Mesure |
|----------|--------------|--------|
| TTI (Time to Interactive) | < 3 s | Lighthouse / CI budget |
| API P95 (hors LLM) | < 500 ms | k6 + Prometheus |
| API P95 LLM première token | < 5 s | Métriques SSE |
| Disponibilité pilote | 99 % | Uptime monitoring |
| RTO backup | < 4 h | Runbook testé |

---

## Backlog « ne pas faire maintenant »

- Refonte design complète (tant que cohérence données + perf non réglées).
- Microservices (monolithe modulaire suffit).
- Application mobile native.
- Fine-tuning modèle propriétaire (d'abord prompts + évaluation).

---

## Jalons suggérés

```text
M1 (fait)    : ARGOS + auth stables, doc à jour
M2 (H1)      : E2E complet, couverture frontend CI, indicateur IA
M3 (H2)      : Observabilité + perf mesurée + pilote 5–10 cliniciens
M4 (H3)      : SSO + dossier conformité + FHIR lecture
M5 (prod)    : HDS, multi-site, SLA N2
```

---

## Comment utiliser ce document

- En **planning** : tirer 2–3 items P1 par sprint max.
- En **revue** : cocher les statuts 🟢/🔴 et déplacer les items non livrés.
- En **onboarding** : [ONBOARDING.md](ONBOARDING.md) puis [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md).
- **Issues GitHub** : `powershell -File scripts/create-hospital-issues.ps1` après `gh auth login`.

Voir aussi : [KNOWN_GAPS.md](KNOWN_GAPS.md), [GITHUB_ISSUES_HOSPITAL.md](GITHUB_ISSUES_HOSPITAL.md).
