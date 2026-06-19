# État du projet (référence “stable”)

Ce document sert de **snapshot** pour savoir ce qui est **fiable** avant d’améliorer/déployer.

## Périmètre

- **Frontend** : `client/` (React + TypeScript + Vite)
- **Backend** : `backend_fastapi/` (FastAPI)
- **Base de données** : PostgreSQL (schéma : **Alembic** ; seeds : `scripts/seed_demo.py`)

## Fonctionnalités disponibles (actuel)

- **Authentification**
  - `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/register`
  - Cookie refresh token `httpOnly`, configurable (`COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`)
- **Rôles et accès**
  - Rôles connus : `admin`, `clinician`, `researcher` (contrôle appliqué côté routes/services)
- **Patients**
  - CRUD patient, pagination, compat payload legacy (Express)
  - Assignation patient à un clinicien (admin)
- **Profil patient**
  - Persistance dédiée : table `patient_profiles` (JSONB + version optimiste)
  - Fallback lecture legacy : `patients.health_info.manual_profile`
- **Dossier clinique structuré**
  - Lecture bundle : `GET /api/patients/{id}/clinical`
  - CRUD par section (mesures, médicaments, chirurgies, radiothérapies, imagerie, cancers/événements TNM, prélèvements, biomarqueurs)
  - Liaison `primary_cancer_id` (migration Alembic `002`)
- **ARGOS**
  - Discussions et messages (endpoints dédiés)
- **IA**
  - Ports `LlmPort` / `LlmSsePort`
  - Providers : `disabled` | `mock_json` | `openai_compatible`
  - Streaming SSE via cas d’usage dédié

## Fonctionnalités incomplètes / à confirmer

- **Migrations Alembic** : couvrent désormais **tout** le schéma (`000` initial + `001`/`002`). Les seeds sont gérés par `scripts/seed_demo.py`.
- **Tests d’intégration DB** : supposent une DB migrée (Alembic) + seedée (`seed_demo.py`). Ils ne dépendent **plus** du fallback démo (`ALLOW_DEMO_PASSWORD_FALLBACK=false`).
- **Durcissement prod** : dépend de la configuration d’environnement (CORS, cookies secure, secret JWT). Le fallback démo est désormais désactivé partout (vrais hashes bcrypt).

## Tests existants

- **Frontend** : Vitest (unit + tests de flux pages/composants)
  - Commandes : `pnpm run typecheck`, `pnpm run test`, `pnpm run build`
  - **E2E** : Playwright (`pnpm run test:e2e:install` puis `pnpm run test:e2e`) — scénario ARGOS minimal
- **Backend** : Pytest (unit + intégration)
  - Commande : `python -m pytest backend_fastapi/tests -q --benchmark-disable`
  - **Couverture globale** : seuil CI ≥ 65 % (`pytest.ini` / `.coveragerc`)
  - **Modules critiques** : ≥ 80 % via `scripts/check-critical-coverage.py` (`patient_clinical_write`, `argos_repository`, `patient_clinical` router)
  - **Pré-requis intégration** : PostgreSQL + DB **seedée** (voir section DB)

## IA / ARGOS (P1 — durcissement)

- **Backend** (`backend_fastapi/app/infrastructure/ai/`)
  - `llm_resilience.py` : retries + circuit breaker sur appels LLM
  - `prompt_safety.py` : sanitisation anti prompt-injection, blocs `<untrusted_*>` dans les prompts
  - `ai_audit.py` : journalisation audit sans PII (hashes)
  - `response_schemas.py` : validation JSON stricte des réponses rapport / ARGOS
  - `prompts.py` : version `PROMPT_VERSION=v1.1.0`
- **Frontend**
  - `ClinicalAiDisclaimer.tsx` : mention « aide à la décision » (ARGOS)
  - `client/lib/argosAiStream.ts` : parsing SSE centralisé
  - `ArgosSpace.tsx` : erreurs IA visibles ; fallback mock **uniquement** si `VITE_ARGOS_MOCK_FALLBACK=true`
- **Provider LLM** : `mock_json` pour dev/CI sans GPU ; `openai_compatible` pour Qwen/vLLM en local

## Variables d’environnement (référence)

Source : `.env.example` (racine), surcharge possible par `backend_fastapi/.env`.

Variables sensibles / sécurité :
- `JWT_SECRET` : **doit** être long et aléatoire en labo/prod
- `ALLOW_DEMO_PASSWORD_FALLBACK` : **false en production**
- `COOKIE_SECURE` : **true** si HTTPS
- `CORS_ORIGINS` : liste stricte (pas de `*`)
- `LLM_API_KEY` : **jamais exposée côté frontend** (backend uniquement)

## Base de données (état actuel)

- **Source de vérité du schéma** : **Alembic** (`000_initial_schema` crée tout le schéma ; `001`/`002` = ajustements).
- **`scripts/seed_demo.py`** : seeds de démo (users avec **vrais hashes bcrypt** + patients), idempotents, à charger après les migrations.
- Création d'une base neuve : `alembic upgrade head` (schéma) puis `python backend_fastapi/scripts/seed_demo.py` (seeds).

Initialisation DB de test (comme en CI, sans `psql`) :
- Linux/macOS : `bash scripts/ci-init-db.sh`
- Windows : `powershell -File scripts/ci-init-db.ps1`

Déploiement Docker : `deploy/entrypoint.sh` applique `alembic upgrade head` (+ seeds) au démarrage du conteneur.

## Limites connues

- Sur un poste **sans** Docker et **sans** `psql`, l’initialisation automatique de la DB de tests n’est pas possible via scripts.
- Les tests d’intégration “auth/patients/admin workflow” supposent des seeds (utilisateurs + patients) chargés via `scripts/seed_demo.py`.

