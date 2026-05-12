# Backend FastAPI ARCANE

Ce dossier contient le backend FastAPI unique du projet.

## État actuel (résumé)

- Architecture refactorisée selon une séparation:
  - `app/domain`
  - `app/application`
  - `app/infrastructure`
  - `app/routers`
- Services métier isolés (auth, admin, patients, ARGOS/IA).
- Compatibilité payload legacy patient maintenue (`age`, `gender`, `birthDate`).
- Endpoints de persistance de profil patient:
  - `GET /api/patients/{id}/profile`
  - `PUT /api/patients/{id}/profile`
- **SQLAlchemy est la référence pour la DB** (pooling + connectivité). Le code historique (SQL brut) continue de fonctionner via `app/db.py`.
- Migration progressive possible via feature flag `DB_IMPLEMENTATION` (cf. section SQLAlchemy).

Pour l'architecture detaillee: `backend_fastapi/ARCHITECTURE_SOLID_DDD.md`.

## Prerequis

- Python 3.12+ (recommandé)
- PostgreSQL (base `arcane` preparee via les scripts SQL du projet)

## Variables d'environnement

Creer un `.env` a la racine projet (ou exporter les variables). Les valeurs sont chargees depuis `backend_fastapi/.env` puis `.env` a la racine (la racine prevaut en cas de doublon).

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=arcane
DB_CONNECT_TIMEOUT_SECONDS=15

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

# SQLAlchemy
SQLALCHEMY_ECHO=false

# Migration contrôlée (par défaut: psycopg, mais SQLAlchemy est déjà utilisé pour le pooling)
# - psycopg: repositories SQL brut uniquement
# - sqlalchemy: lecture user via SQLAlchemy + fallback SQL brut pour le reste (démonstration)
DB_IMPLEMENTATION=psycopg
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

## SQLAlchemy (ce que ça change)

### Pourquoi SQLAlchemy est “la référence”
Le projet utilise SQLAlchemy comme **source de vérité** pour :
- le **pool de connexions**
- le **pre-ping**
- la configuration driver via `settings.database_url` (`postgresql+psycopg://...`)

Le code existant (repositories SQL brut) continue à utiliser `fetch_one/fetch_all/execute` et `DbUnitOfWork`, mais ces fonctions s’appuient maintenant sur des connexions fournies par l’engine SQLAlchemy.

### Migration contrôlée (feature flag)
Le flag `DB_IMPLEMENTATION` permet de démontrer une migration incrémentale :
- `psycopg` (défaut) : repositories SQL brut
- `sqlalchemy` : lecture user via SQLAlchemy (auth) + fallback SQL brut pour le reste

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
- `POST /api/patients/{id}/assign` (admin)
- `POST /api/patients/import`
- `GET /api/patients/{id}/profile`
- `PUT /api/patients/{id}/profile`

Payload reaffectation (`POST /api/patients/{id}/assign`):
- accepte `clinician_id` (alias supportes: `assigned_clinician_id`, `assignedClinicianId`)
- compte cible: role `clinician` (actif ou en attente)

Regles d'acces patient:
- `clinician`: acces uniquement aux patients qui lui sont affectes (`assigned_clinician_id`)
- `admin`: acces a tous les dossiers patients + reaffectation possible
- creation patient: assignation par defaut au createur (admin ou clinicien) si aucun assignee explicite

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
pytest
pytest -q
```

Dernier snapshot local (sur la machine de dev):
- tests backend: **≈ 70+** tests OK
- couverture backend (indicative): ~**65–70%** (elle varie selon l’accès DB/LLM activé)

## Persistance profil patient

- Les profils saisis via `PUT /api/patients/{id}/profile` sont stockes dans la table **`patient_profiles`** (JSONB + versionnement optimiste).
- Les anciennes donnees dans `patients.health_info.manual_profile` sont encore **lues** si aucune ligne dediee n'existe (migration douce). Une sauvegarde via l'API ecrit dans `patient_profiles` et supprime les cles legacy dans `health_info`.
- Nouvelle installation: executer `setup_database.sql` (inclut `patient_profiles`).
- Base existante: executer une fois `backend_fastapi/sql/migrate_patient_profiles.sql`.

## Notes d'implementation

- Les routes HTTP sont fines et délèguent la logique métier aux services applicatifs.
- Les erreurs métier passent par `ApplicationError`, converties en `HTTPException` dans les routeurs.
