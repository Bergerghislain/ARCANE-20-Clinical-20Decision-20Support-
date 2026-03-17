# Backend FastAPI

Ce dossier contient désormais le backend **FastAPI unique** du projet ARCANE.

## Prérequis

- Python 3.11+ (recommandé)
- Une base PostgreSQL avec le schéma de `setup_database.sql`

## Variables d’environnement

Créer un fichier `.env` (exemple ci-dessous) à la racine de `backend_fastapi/` ou exporter ces variables.

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=arcane

JWT_SECRET=change_me_dev_only
JWT_ISSUER=arcane
JWT_AUDIENCE=arcane-client
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Mettre à false en production
ALLOW_DEMO_PASSWORD_FALLBACK=true

# CORS (séparé par des virgules). Ex: http://localhost:8080
CORS_ORIGINS=http://localhost:8080
```

## Installation

```bash
cd backend_fastapi
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

## Lancer en local

```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints disponibles

- `GET /api/ping`
- `GET /api/demo`
- `POST /api/auth/login` -> `{ token, user }`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/patients` (protégé)
- `GET /api/patients/{id}` (protégé)
- `POST /api/patients` (protégé)
- `PUT /api/patients/{id}` (protégé)
- `POST /api/patients/import` (protégé)
- `GET /api/admin/users` (admin)
- `POST /api/admin/users/{id}/validate` (admin)

## Notes migration

- Le frontend doit envoyer `Authorization: Bearer <token>` sur les routes protégées.
- Les payloads patients historiques de l'ancien backend Express (`age`, `gender`, `birthDate`) sont supportés par FastAPI pour compatibilité.
- La structure backend suit désormais une séparation `domain` / `application` / `infrastructure` / `routers`.
- Voir le guide: `backend_fastapi/ARCHITECTURE_SOLID_DDD.md`.
