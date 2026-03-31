# Backend FastAPI ARCANE

Ce dossier contient le backend FastAPI unique du projet.

## Etat actuel

- Architecture refactorisee selon une separation:
  - `app/domain`
  - `app/application`
  - `app/infrastructure`
  - `app/routers`
- Services metier isoles (auth, admin, patients, argos).
- Compatibilite payload legacy patient maintenue (`age`, `gender`, `birthDate`).
- Endpoint de persistence de profil patient ajoute:
  - `GET /api/patients/{id}/profile`
  - `PUT /api/patients/{id}/profile`

Pour l'architecture detaillee: `backend_fastapi/ARCHITECTURE_SOLID_DDD.md`.

## Prerequis

- Python 3.11+
- PostgreSQL (base `arcane` preparee via les scripts SQL du projet)

## Variables d'environnement

Creer un `.env` a la racine projet (ou exporter les variables):

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
REFRESH_TOKEN_EXPIRE_DAYS=7

PING_MESSAGE=ping

# Cookies refresh token
COOKIE_DOMAIN=
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# CORS (liste separee par virgules)
CORS_ORIGINS=http://localhost:8080

# Mettre a false en production
ALLOW_DEMO_PASSWORD_FALLBACK=true
```

## Installation

```bash
cd backend_fastapi
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

python -m pip install -r requirements.txt
```

## Lancement local

Depuis la racine:
```bash
python -m uvicorn backend_fastapi.app.main:app --reload --port 8000
```

Depuis `backend_fastapi/`:
```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints exposes

### Systeme
- `GET /api/ping`
- `GET /api/demo`

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Patients (clinician/admin)
- `GET /api/patients`
- `GET /api/patients/{id}`
- `POST /api/patients`
- `PUT /api/patients/{id}`
- `POST /api/patients/import`
- `GET /api/patients/{id}/profile`
- `PUT /api/patients/{id}/profile`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users/{id}/validate`

### ARGOS (clinician)
- `POST /api/argos/discussions`
- `GET /api/argos/discussions`
- `GET /api/argos/discussions/{discussion_id}`
- `GET /api/argos/discussions/{discussion_id}/messages`
- `POST /api/argos/discussions/{discussion_id}/messages`

## Tests backend

```bash
python -m pytest backend_fastapi/tests -q
python -m pytest backend_fastapi/tests --cov=backend_fastapi/app --cov-report=term-missing
```

Dernier snapshot local:
- `21` tests passes
- couverture `backend_fastapi/app`: **68%**

## Notes d'implementation

- Les routes HTTP sont fines et deleguent la logique metier aux services applicatifs.
- Les erreurs metier passent par `ApplicationError`, converties en `HTTPException` dans les routeurs.
- La persistence du profil patient est actuellement stockee dans `health_info.manual_profile` (strategie transitoire avant table dediee).
