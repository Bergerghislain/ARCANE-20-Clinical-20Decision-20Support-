# Backend FastAPI ARCANE

Ce dossier contient le backend FastAPI unique du projet.

## État actuel (résumé)

- Architecture en couches :
  - `app/domain` — entités et règles métier pures
  - `app/application` — services, ports, cas d'usage, politiques
  - `app/infrastructure` — SQL, sécurité, clients LLM
  - `app/routers` — routes HTTP fines
- Services métier : `AuthService`, `AdminService`, `PatientService`, `ArgosService`, `AiService`.
- **Cas d'usage** extraits pour le profil patient et le streaming LLM (testables sans routeur).
- Compatibilité payload legacy patient (`age`, `gender`, `birthDate`).
- Persistance profil : table **`patient_profiles`** (JSONB + versionnement optimiste) avec repli lecture sur `health_info.manual_profile`.
- **SQLAlchemy** : référence pour le pool de connexions ; accès SQL brut via `app/db.py` inchangé côté repositories.
- **IA** : ports `LlmPort` (sync) et `LlmSsePort` (SSE) ; implémentations `MockJsonLlmClient` / `OpenAiCompatibleClient` ; streaming via `StreamLlmSseUseCase`.

Architecture détaillée : [`ARCHITECTURE_SOLID_DDD.md`](ARCHITECTURE_SOLID_DDD.md).  
Intégration Qwen / LLM : [`../docs/QWEN_INTEGRATION.md`](../docs/QWEN_INTEGRATION.md).

## Prérequis

- Python 3.12+ (recommandé)
- PostgreSQL (schéma créé par **Alembic** ; seeds de démo via `setup_database.sql`)

## Variables d'environnement

Créer un `.env` à la racine du dépôt ou dans `backend_fastapi/`. En cas de doublon, **la racine du dépôt l'emporte** (voir `app/settings.py`).

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=arcane
DB_CONNECT_TIMEOUT_SECONDS=15

# JWT
JWT_SECRET=change_me_dev_only
JWT_ISSUER=arcane
JWT_AUDIENCE=arcane-client
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Divers
PING_MESSAGE=ping
COOKIE_DOMAIN=
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
CORS_ORIGINS=http://localhost:8080
ALLOW_DEMO_PASSWORD_FALLBACK=true

# SQLAlchemy
SQLALCHEMY_ECHO=false
DB_IMPLEMENTATION=psycopg

# LLM (proxy backend — ne pas exposer la clé au navigateur)
# Valeurs : disabled | mock_json | openai_compatible
LLM_PROVIDER=disabled
LLM_BASE_URL=http://127.0.0.1:8001/v1
LLM_API_KEY=
LLM_MODEL=Qwen/Qwen3-4B
LLM_TIMEOUT_SECONDS=120
LLM_TEMPERATURE=0.7
LLM_TOP_P=0.9
LLM_MAX_TOKENS=1200
```

| `LLM_PROVIDER`        | Comportement |
|-----------------------|--------------|
| `disabled` (défaut)   | Chat sync → 503 ; streaming SSE → 503 via `StreamLlmSseUseCase` |
| `mock_json`           | Réponses JSON déterministes (démos, CI, sans réseau) |
| `openai_compatible`   | Appels vers vLLM / sglang / TGI (endpoint `/v1/chat/completions`) |

## Installation

```bash
cd backend_fastapi
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

python -m pip install -r requirements.txt
```

## Lancement local

Depuis la racine du dépôt :

```bash
python -m uvicorn backend_fastapi.app.main:app --reload --port 8000
```

Depuis `backend_fastapi/` :

```bash
uvicorn app.main:app --reload --port 8000
```

## SQLAlchemy et migration DB

- **Pool** : engine SQLAlchemy (`postgresql+psycopg://…`) avec pre-ping.
- **Repositories** : SQL brut via `fetch_one` / `fetch_all` / `DbUnitOfWork` (connexions issues du pool).
- **Flag `DB_IMPLEMENTATION`** :
  - `psycopg` (défaut) : `SqlUserRepository` partout ;
  - `sqlalchemy` : `HybridUserRepository` pour les utilisateurs (démo de migration incrémentale).

## Migrations Alembic (source de vérité du schéma)

**Alembic crée l'intégralité du schéma.** Une base vide est construite par
`alembic upgrade head`. `setup_database.sql` (racine) ne contient plus que les
**seeds** de démo, à charger après les migrations.

| Révision | Fichier | Effet |
|----------|---------|--------|
| `000` | `000_initial_schema.py` | **Schéma complet** ARCANE (toutes les tables + index), idempotent (`IF NOT EXISTS`) |
| `001` | `001_patient_profiles.py` | Table `patient_profiles` (no-op sur une base créée par `000`) |
| `002` | `002_clinical_primary_cancer_link.py` | Colonne `primary_cancer_id` (FK) sur `surgeries`, `radiotherapies`, `imaging_studies` (no-op si déjà présente) |

Créer une base neuve, de bout en bout :

```bash
# 1) schéma (depuis backend_fastapi/)
cd backend_fastapi
alembic upgrade head
alembic current   # -> 002_clinical_primary_cancer_link (head)

# 2) seeds de démo (depuis la racine du dépôt) — sans psql requis
python backend_fastapi/scripts/apply_sql.py setup_database.sql
```

Raccourci local équivalent : `scripts/ci-init-db.ps1` (Windows) ou `bash scripts/ci-init-db.sh`.

Tester la réversibilité (déployabilité) :

```bash
cd backend_fastapi
alembic downgrade -1
alembic upgrade head
```

`000` est **idempotent** : l'appliquer sur une base déjà créée par l'ancien
`setup_database.sql` ne fait que l'enregistrer dans `alembic_version`.
Migration ponctuelle des profils sur base ancienne : `backend_fastapi/sql/migrate_patient_profiles.sql`.

## Persistance profil patient

- **Écriture** : `PUT /api/patients/{id}/profile` → table `patient_profiles` (conflit 409 si `profileVersion` obsolète).
- **Lecture** : `GET /api/patients/{id}/profile` → `patient_profiles` en priorité, sinon `health_info.manual_profile` (migration douce).
- **Politique** : `app/application/patient_profile_policy.py` (migration schéma v1→v2, contrôle d'accès clinician/admin).
- **Cas d'usage** : `GetPatientProfileUseCase`, `SavePatientProfileUseCase` ; `PatientService` délègue à ces classes.

## Endpoints exposés

### Système

- `GET /api/ping`
- `GET /api/demo`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Patients (clinician / admin)

- `GET /api/patients`
- `GET /api/patients/{id}`
- `POST /api/patients`
- `PUT /api/patients/{id}`
- `POST /api/patients/{id}/assign` (admin)
- `POST /api/patients/import`
- `GET /api/patients/{id}/profile`
- `PUT /api/patients/{id}/profile`

**Réaffectation** (`POST /api/patients/{id}/assign`) : corps `clinician_id` (alias `assigned_clinician_id`, `assignedClinicianId`) ; cible = compte `clinician` actif ou en attente.

**Accès** :

- `clinician` : patients dont `assigned_clinician_id` = utilisateur courant ;
- `admin` : tous les dossiers + réaffectation ;
- création : assignation par défaut au créateur si aucun assigné explicite.

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users/{id}/validate`

### ARGOS (clinician / admin)

- `POST /api/argos/discussions`
- `GET /api/argos/discussions`
- `GET /api/argos/discussions/{discussion_id}`
- `GET /api/argos/discussions/{discussion_id}/messages`
- `POST /api/argos/discussions/{discussion_id}/messages`

### IA (clinician / admin)

- `POST /api/ai/report` — rapport structuré (JSON)
- `POST /api/ai/report/stream` — même entrée, réponse **SSE**
- `POST /api/ai/argos/respond` — réponse ARGOS (JSON)
- `POST /api/ai/argos/respond/stream` — même entrée, réponse **SSE**

Le streaming passe par `StreamLlmSseUseCase` et un `LlmSsePort` injecté (`deps.get_stream_llm_sse_use_case`), ce qui permet de surcharger le port en tests sans modifier `settings` globalement.

## Couche application (référence rapide)

| Composant | Rôle |
|-----------|------|
| `patient_profile_policy.py` | Migration schéma, `profileVersion`, contrôle d'accès |
| `use_cases/patient_profile.py` | GET/PUT profil |
| `use_cases/stream_llm_sse.py` | Itération événements SSE |
| `ports/llm_ports.py` | `LlmPort`, `LlmSsePort` |
| `deps.py` | Injection FastAPI (repos, services, cas d'usage) |

Les routeurs convertissent `ApplicationError` → `HTTPException`.

## Tests backend

```bash
cd backend_fastapi
pytest
pytest -q
pytest --benchmark-disable
pytest tests/test_performance_smoke_unit.py -m perf -v
pytest tests/test_stream_llm_sse_use_case_unit.py -v
pytest tests/test_patient_repository_profile_sql_unit.py -v
```

Dernier snapshot local (sans PostgreSQL requis pour la majorité des tests unitaires) :

- **90** tests collectés ; suite verte avec `--benchmark-disable` ;
- couverture indicative **~69 %** (varie selon accès DB / LLM).

## Notes d'implémentation

- Routes HTTP fines → services ou cas d'usage.
- Erreurs métier : `ApplicationError` (`status_code`, `detail`).
- Cache court sur `find_by_id` utilisateur (`USER_CACHE_TTL_SECONDS`).
