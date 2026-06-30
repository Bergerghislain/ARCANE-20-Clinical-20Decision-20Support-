# ARCANE - Plateforme d'aide a la decision clinique

[![CI](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/actions/workflows/ci.yml/badge.svg)](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/actions/workflows/ci.yml)

ARCANE est une plateforme clinique centree sur les cancers rares.  
Le projet combine:
- un **frontend React/TypeScript** (dashboard patient, dossier patient, espace ARGOS),
- un **backend FastAPI** (authentification, patients, administration, ARGOS),
- une base **PostgreSQL + Alembic**.

> **Documentation** : [`docs/ROADMAP.md`](docs/ROADMAP.md), [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), [`docs/LABO_SECURITY.md`](docs/LABO_SECURITY.md).

## Etat actuel du projet (mise a jour)

### Backend
- Refactorisation appliquee selon une architecture `domain` / `application` / `infrastructure` / `routers`.
- Services metier centralises (`AuthService`, `AdminService`, `PatientService`, `ArgosService`).
- Injection de dependances centralisee (`backend_fastapi/app/deps.py`).
- Endpoints patient enrichis avec la persistence de profil (`patient_profiles` + lecture legacy `health_info`):
  - `GET /api/patients/{id}/profile`
  - `PUT /api/patients/{id}/profile`
- Endpoints utilises par le Patient Handler admin:
  - `GET /api/patients`
  - `GET /api/admin/users?status=ACTIF|EN_ATTENTE`
  - `POST /api/patients/{id}/assign`
- Regle d'assignation a la creation: par defaut, le patient est assigne au createur (admin ou clinicien), sauf assignee explicite.
- Gestion d'erreurs metier uniformisee via `ApplicationError`.

### Frontend
- Dashboard patient avec recherche, filtres et import JSON.
- Auto-refresh du dashboard (event local + polling) pour reflet immediat des reaffectations.
- Dossier patient par onglets (`Patient Infos`, `Report`, `ARGOS`).
- Vue admin `Patient Handler` exposee sur `/admin/patient-handler` pour reaffecter un patient a un clinicien.
- Generation rapport / ARGOS: flux **reel** si `LLM_PROVIDER=openai_compatible` et endpoint LLM joignable; mode **`mock_json`** pour reponses JSON sans reseau (demos, tests).
- Transfert automatique du contexte patient vers ARGOS.
- Validation de profil patient via schema Zod (`schemaVersion`).
- Persistence hybride des saisies:
  - draft local (`localStorage`)
  - synchro backend via API profil patient (table `patient_profiles` cote serveur).

### Tests
- Frontend: tests unitaires + tests de flux composant (Vitest + Testing Library).
- Backend: tests integration FastAPI (auth, admin, patients, connexion IA API).
- Dernier run backend local: **70+ tests passent** (selon disponibilité PostgreSQL).

## Stack technique

- **Frontend**: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Vitest.
- **Backend**: FastAPI, Pydantic v2, psycopg, passlib/bcrypt, JWT (python-jose).
- **DB**: PostgreSQL.

## Structure du depot

```text
client/                Frontend React/TypeScript
backend_fastapi/       API FastAPI + architecture metier
public/patient-reports/ JSON de simulation patient/report
package.json           Scripts frontend + run backend via npm/pnpm
```

## Installation

## 1) Prerequis
- Node.js LTS (20+ recommande)
- pnpm (recommande)
- Python 3.11+
- PostgreSQL

## 2) Cloner
```bash
git clone https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-.git
cd ARCANE-20-Clinical-20Decision-20Support-
```

## 3) Installer les dependances frontend
```bash
pnpm install
```

## 4) Installer les dependances backend
```bash
python -m pip install -r backend_fastapi/requirements.txt
```

## 5) Initialiser la base
- Creer la base `arcane` (vide).
- **Schema = Alembic (source de verite)**, puis **seeds** de demo :

```bash
# 1) schema
cd backend_fastapi
alembic upgrade head
cd ..

# 2) seeds de demo (vrais hashes bcrypt, sans psql requis)
python backend_fastapi/scripts/seed_demo.py
```

Raccourci : `bash scripts/ci-init-db.sh` (ou `powershell -File scripts/ci-init-db.ps1` sous Windows) execute ces deux etapes. Voir `backend_fastapi/README.md` (section Migrations Alembic) pour le detail et le test de reversibilite.

Identifiants admin de demo (apres seeds) : utilisateur `admin` (ou `admin@arcane.com`), mot de passe `password` (configurable via `SEED_DEMO_PASSWORD`). Le mot de passe est stocke en **vrai hash bcrypt** : `ALLOW_DEMO_PASSWORD_FALLBACK` reste `false`.

## Lancer le projet en developpement

Terminal 1 (API FastAPI):
```bash
pnpm run dev:api
```

Terminal 2 (frontend Vite):
```bash
pnpm run dev

```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`
- Le proxy Vite redirige `/api/*` vers FastAPI.

## Build / execution

```bash
pnpm run build
pnpm run start
```

- `pnpm run start` lance FastAPI sur `0.0.0.0:8000` et, si `dist/spa` existe (apres `pnpm run build`), sert aussi le frontend (une seule URL pour le labo).

## Deploiement sur serveur local (labo)

### Principe

1. PostgreSQL accessible depuis le serveur (installe sur la meme machine ou sur une VM du labo).
2. Fichier `.env` a la racine du depot (voir `.env.example`): mots de passe forts, `JWT_SECRET` aleatoire long, `ALLOW_DEMO_PASSWORD_FALLBACK=false`, `CORS_ORIGINS` incluant l'URL utilisee par les navigateurs du labo (ex. `http://192.168.1.50:8000`).
3. Build du SPA puis demarrage de l'API depuis la racine du clone:

```bash
pnpm install
python -m pip install -r backend_fastapi/requirements.txt
pnpm run build
pnpm run start
```

Acces: `http://<ip-du-serveur>:8000`. Ne pas definir `VITE_API_BASE_URL` pour ce mode: le frontend appelle `/api/...` en meme origine.

### Option Docker (PostgreSQL + app)

Depuis la racine du depot (Docker / Docker Compose installes):

```bash
pnpm run compose:up
```

Adapter les variables dans `deploy/docker-compose.yml` (mots de passe, `JWT_SECRET`, `CORS_ORIGINS`). Au demarrage, le conteneur applicatif execute `alembic upgrade head` puis charge les seeds (`deploy/entrypoint.sh`). Mettre `SEED_ON_START=false` pour ne pas inserer les donnees de demo.

Arret: `pnpm run compose:down`.

## CI (GitHub Actions)

Badge ci-dessus : etat du dernier run sur `main`. Configuration labo (secrets, JWT, CORS) : **`docs/LABO_SECURITY.md`**. Protection de branche : **`docs/GITHUB_BRANCH_PROTECTION.md`**.

Le workflow `.github/workflows/ci.yml` execute a chaque push/PR sur `main` :

| Job | Etapes |
|-----|--------|
| **frontend** | `pnpm install --frozen-lockfile` → `typecheck` → `test` → `build` |
| **backend** | PostgreSQL 16 (service) → `alembic upgrade head` → smoke test migrations (`downgrade -1` / `upgrade head`) → seeds → `pytest` |

Variables CI backend : `JWT_SECRET` dedie, `ALLOW_DEMO_PASSWORD_FALLBACK=false` (les seeds creent de vrais hashes bcrypt, on ne depend plus du fallback).

PostgreSQL de test en local (apres creation de la base `arcane`) — schema Alembic + seeds, sans `psql` :

```bash
# Linux / macOS / cloud
bash scripts/ci-init-db.sh

# Windows
powershell -File scripts/ci-init-db.ps1
```

## Commandes de test

### Frontend
```bash
pnpm run typecheck
pnpm run test
pnpm run test -- --coverage
```

### Backend
Tout le detail (pytest, benchmarks, Alembic, variables d'environnement, endpoints API) est dans **`backend_fastapi/README.md`** pour eviter la divergence avec ce README racine.

Commandes courantes depuis la racine:
```bash
cd backend_fastapi
python -m pytest tests/ -q --benchmark-disable
```

## Notes de couverture (snapshot local recent)

- Couverture backend (`backend_fastapi/app`): **68%**.
- Couverture elevee sur les flux dashboard/patient frontend, mais couverture globale frontend encore basse car de nombreux modules UI/pages ne sont pas encore testes.

## Documentation utile

- Roadmap : [`docs/ROADMAP.md`](docs/ROADMAP.md)
- État fonctionnel : [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- Sécurité labo : [`docs/LABO_SECURITY.md`](docs/LABO_SECURITY.md)
- Protection branches GitHub : [`docs/GITHUB_BRANCH_PROTECTION.md`](docs/GITHUB_BRANCH_PROTECTION.md)
- Intégration LLM : [`docs/QWEN_INTEGRATION.md`](docs/QWEN_INTEGRATION.md)
- Architecture backend : `backend_fastapi/ARCHITECTURE_SOLID_DDD.md`
- README backend : `backend_fastapi/README.md`

## Limitations connues / prochaines etapes

- Generation **reelle** par LLM: definir `LLM_PROVIDER=openai_compatible` et un endpoint compatible OpenAI (`LLM_BASE_URL`, `LLM_MODEL`, etc.). Sans LLM, `LLM_PROVIDER=mock_json` fournit des reponses JSON valides pour demos / tests (pas de reseau).
- Bases existantes sans `patient_profiles`: `backend_fastapi/sql/migrate_patient_profiles.sql` ou `alembic upgrade head` (voir README backend).
