# État du projet (référence “stable”)

Ce document sert de **snapshot** pour savoir ce qui est **fiable** avant d’améliorer/déployer.

## Périmètre

- **Frontend** : `client/` (React + TypeScript + Vite)
- **Backend** : `backend_fastapi/` (FastAPI)
- **Base de données** : PostgreSQL (schéma principal : `setup_database.sql`)

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

- **Migrations Alembic** : seulement une partie du schéma est couverte (migrations 001/002). Le schéma complet est encore porté par `setup_database.sql`.
- **Tests d’intégration DB** : supposent une DB initialisée via `setup_database.sql` (seeds inclus).
- **Durcissement prod** : dépend de la configuration d’environnement (CORS, cookies secure, secret JWT, suppression fallback démo).

## Tests existants

- **Frontend** : Vitest (unit + tests de flux pages/composants)
  - Commandes : `pnpm run typecheck`, `pnpm run test`, `pnpm run build`
- **Backend** : Pytest (unit + intégration)
  - Commande : `python -m pytest backend_fastapi/tests -q --benchmark-disable`
  - **Pré-requis intégration** : PostgreSQL + DB **seedée** (voir section DB)

## Variables d’environnement (référence)

Source : `.env.example` (racine), surcharge possible par `backend_fastapi/.env`.

Variables sensibles / sécurité :
- `JWT_SECRET` : **doit** être long et aléatoire en labo/prod
- `ALLOW_DEMO_PASSWORD_FALLBACK` : **false en production**
- `COOKIE_SECURE` : **true** si HTTPS
- `CORS_ORIGINS` : liste stricte (pas de `*`)
- `LLM_API_KEY` : **jamais exposée côté frontend** (backend uniquement)

## Base de données (état actuel)

- **Source de vérité actuelle** : `setup_database.sql` (schéma complet + seeds)
- **Alembic** : présent, mais partiel (voir `backend_fastapi/README.md`)

Initialisation DB de test (comme en CI) :
- CI Linux : `bash scripts/ci-init-db.sh`
- Windows (si `psql` disponible) : `powershell -File scripts/ci-init-db.ps1`

## Limites connues

- Sur un poste **sans** Docker et **sans** `psql`, l’initialisation automatique de la DB de tests n’est pas possible via scripts.
- Les tests d’intégration “auth/patients/admin workflow” supposent des seeds (utilisateurs + patients) cohérents avec `setup_database.sql`.

