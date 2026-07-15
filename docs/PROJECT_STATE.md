# État du projet (référence « stable »)

Snapshot pour savoir ce qui est **fiable aujourd'hui** avant d'améliorer ou déployer.  
**Index doc** : [README.md](../README.md) · **Roadmap** : [ROADMAP.md](ROADMAP.md) · **Lacunes** : [KNOWN_GAPS.md](KNOWN_GAPS.md) · **Hôpital** : [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md)

**Dernière mise à jour** : juillet 2026

---

## Périmètre

- **Frontend** : `client/` (React + TypeScript + Vite)
- **Backend** : `backend_fastapi/` (FastAPI)
- **Base** : PostgreSQL (Alembic + `scripts/seed_demo.py`)

---

## Maturité globale estimée : ~6 / 10

Backend et CI solides ; prod hospitalière et performance à l'échelle encore en construction. Détail : [KNOWN_GAPS.md](KNOWN_GAPS.md).

| Dimension | Score |
|-----------|-------|
| Architecture backend | 7/10 |
| Données & migrations | 7/10 |
| Sécurité | 6/10 |
| Tests & CI | 6,5/10 |
| Frontend | ~5,5/10 |
| Prod / entreprise | 3/10 |
| Cohérence produit | ~6/10 |

---

## Fonctionnalités fiables

### Authentification

- `POST /api/auth/login`, `refresh`, `logout`, `register`
- Cookie refresh HttpOnly (`COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`)
- **Frontend** : access token en mémoire ; intercepteur 401 → refresh → retry (`client/lib/api.ts`) ; bootstrap au chargement (`App.tsx`)

### Rôles

- `admin`, `clinician`, `researcher` — RBAC routes/services

### Patients

- CRUD, pagination, profil JSON (`patient_profiles`)
- Assignation clinicien (admin)
- Bundle clinique structuré `GET /api/patients/{id}/clinical` + CRUD sections

### Dossier patient (UI)

- `PatientFile.tsx` orchestrateur (~200 lignes)
- Logique : `usePatientReport`, `usePatientClinicalBundle`
- UI : `components/patient-file/*`
- Autosave profil : draft `localStorage` + API (**badge sync** : 🟢 `ProfileSyncStatusBadge`)

### ARGOS

- API : discussions + messages persistés PostgreSQL
- Frontend : historique via **API** (`useArgosHistory` + `argosMappers`) — plus de `localStorage` conversations
- Liste patients : **`GET /api/patients`** via `useArgosPatients` + React Query
- **F5** : `sessionStorage` (`argosSession.ts`) + restauration après sync API (`ArgosSpace.tsx`)
- Qualité chat : contexte patient invisible côté UI, filtrage échos JSON, i18n FR
- `GET /api/ai/status` pour état LLM

### IA

- Providers : `disabled` | `mock_json` | `openai_compatible` (Ollama, Groq documentés)
- Streaming SSE rapport ; prompt safety, audit, schémas JSON stricts côté backend
- Circuit breaker / résilience LLM (`llm_resilience.py`)
- Indicateur UI mock vs réel : **à faire** (issue backlog)

### Admin

- `/admin/users`, `/admin/patient-handler`

### Cache client

- React Query : patients, profil, bundle clinique, discussions ARGOS (`client/hooks/queries/`)

---

## Outillage & CI

| Outil | Scope |
|-------|--------|
| TypeScript `strictNullChecks` | `client/` |
| ESLint | `client/` (`pnpm run lint`) |
| Ruff | `backend_fastapi/` |
| Vitest | ~20+ fichiers tests frontend |
| Pytest | ~38 fichiers tests backend |
| Playwright | `e2e/argos-flow.spec.ts`, `e2e/auth-session.spec.ts` |

Workflow : `.github/workflows/ci.yml` (frontend + backend + E2E).

---

## Variables d'environnement sensibles

Voir `.env.example` et [LABO_SECURITY.md](LABO_SECURITY.md).

- `JWT_SECRET` — obligatoire en prod
- `ALLOW_DEMO_PASSWORD_FALLBACK=false`
- `LLM_API_KEY` — backend uniquement

---

## Base de données

- Schéma : `alembic upgrade head`
- Seeds : `python backend_fastapi/scripts/seed_demo.py`
- Init type CI : `scripts/ci-init-db.ps1` / `.sh`

---

## Limites connues (résumé)

1. Mot de passe oublié : écran sans API.
2. Pas d'observabilité prod (logs structurés, metrics, alerting).
3. Couverture frontend non seuillée en CI.
4. Pas de SSO / MFA / HDS documenté.
5. Pas de tests de charge ni SLO performance.
6. Profil patient : badge brouillon/sync incomplet.
7. Pages admin / Help : i18n EN résiduel (P2).

Liste complète : [KNOWN_GAPS.md](KNOWN_GAPS.md).

---

## Prochaines étapes recommandées

1. **H1** : E2E parcours complet, seuil couverture frontend, badge profil, indicateur IA.
2. **H2** : observabilité, pipeline déploiement, backup/restore, reset MDP, tests de charge.
3. **H3** : SSO, MFA, conformité RGPD/HDS, FHIR, multi-établissement.

Voir [ROADMAP.md](ROADMAP.md), [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md) et issues GitHub (`scripts/create-hospital-issues.ps1`).
