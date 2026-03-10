## Backend FastAPI (nouveau)

Ce dossier contient un backend **FastAPI** qui peut cohabiter avec le backend Express existant le temps de la migration.

### Prérequis

- Python 3.11+ (recommandé)
- Une base PostgreSQL avec le schéma de `setup_database.sql`

### Variables d’environnement

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

# CORS (séparé par des virgules). Ex: http://localhost:8080
CORS_ORIGINS=http://localhost:8080
```

### Installation

```bash
cd backend_fastapi
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

### Lancer en local

```bash
uvicorn app.main:app --reload --port 8000
```

### Endpoints disponibles

- `GET /api/ping`
- `POST /api/auth/login` -> `{ token, user }` (compatible avec ton frontend actuel)
- `GET /api/patients` (protégé)
- `GET /api/patients/{id}` (protégé)
- `POST /api/patients` (protégé)

### Notes migration

- Ton frontend appelle actuellement `/api/patients` sans envoyer le token. Avec ce backend FastAPI, ces routes sont protégées: il faudra ajouter `Authorization: Bearer <token>` côté client (ou basculer vers cookies HttpOnly plus tard).

