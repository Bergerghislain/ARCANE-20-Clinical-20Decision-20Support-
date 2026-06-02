# Backend FastAPI ARCANE

Ce dossier contient le backend FastAPI unique du projet.

## État actuel (résumé)

- Architecture en couches :
  - `app/domain` — entités et règles métier pures
  - `app/application` — services, ports, cas d'usage, politiques
  - `app/infrastructure` — SQL, sécurité, clients LLM
  - `app/routers` — routes HTTP fines
- Services métier : `AuthService`, `AdminService`, `PatientService`, `PatientClinicalService`, `ArgosService`, `AiService`.
- **Dossier clinique structuré** : lecture SQL → JSON `PatientClinicalDataIn` ; CRUD section par section (mesures, traitements, cancer, prélèvements).
- **Cas d'usage** extraits pour le profil patient, le bundle clinique et le streaming LLM (testables sans routeur).
- Compatibilité payload legacy patient (`age`, `gender`, `birthDate`).
- Persistance profil : table **`patient_profiles`** (JSONB + versionnement optimiste) avec repli lecture sur `health_info.manual_profile`.
- **SQLAlchemy** : référence pour le pool de connexions ; accès SQL brut via `app/db.py` inchangé côté repositories.
- **IA** : ports `LlmPort` (sync) et `LlmSsePort` (SSE) ; implémentations `MockJsonLlmClient` / `OpenAiCompatibleClient` ; streaming via `StreamLlmSseUseCase`.

Architecture détaillée : [`ARCHITECTURE_SOLID_DDD.md`](ARCHITECTURE_SOLID_DDD.md).  
Intégration Qwen / LLM : [`../docs/QWEN_INTEGRATION.md`](../docs/QWEN_INTEGRATION.md).

## Prérequis

- Python 3.12+ (recommandé)
- PostgreSQL (base `arcane` via `setup_database.sql` ou Alembic)

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
ALLOW_DEMO_PASSWORD_FALLBACK=false

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

Sécurité labo / production : voir [`../docs/LABO_SECURITY.md`](../docs/LABO_SECURITY.md) et `scripts/validate-lab-env.py` à la racine du dépôt. En CI, `ALLOW_DEMO_PASSWORD_FALLBACK=true` est forcé dans `tests/conftest.py` pour les tests d'intégration auth.

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

## Migrations Alembic

Révisions dans `alembic/versions/` (idempotentes si la base a déjà été créée via `setup_database.sql` à la racine du dépôt) :

| Révision | Fichier | Effet |
|----------|---------|--------|
| `001` | `001_patient_profiles.py` | Table `patient_profiles` (JSONB + versionnement) |
| `002` | `002_clinical_primary_cancer_link.py` | Colonne `primary_cancer_id` (nullable, FK) sur `surgeries`, `radiotherapies`, `imaging_studies` |

```bash
cd backend_fastapi
alembic upgrade head
alembic current
```

Base existante sans Alembic :

- profils : `backend_fastapi/sql/migrate_patient_profiles.sql` ;
- schéma clinique complet : réexécuter `setup_database.sql` sur une base vide, ou appliquer `alembic upgrade head` sur une base déjà initialisée.

## Persistance profil patient

- **Écriture** : `PUT /api/patients/{id}/profile` → table `patient_profiles` (conflit 409 si `profileVersion` obsolète).
- **Lecture** : `GET /api/patients/{id}/profile` → `patient_profiles` en priorité, sinon `health_info.manual_profile` (migration douce).
- **Politique** : `app/application/patient_profile_policy.py` (migration schéma v1→v2, contrôle d'accès clinician/admin).
- **Cas d'usage** : `GetPatientProfileUseCase`, `SavePatientProfileUseCase` ; `PatientService` délègue à ces classes.

## Dossier clinique structuré (`clinicalData`)

Contrat JSON aligné sur `PatientClinicalDataIn` (`app/schemas.py`) : identité, `mesureList`, `medication`, `surgery`, `primaryCancer[]` (grades, stades, TNM, imagerie, chirurgie, radiothérapie par cancer), `biologicalSpecimenList` (biomarqueurs).

### Lecture

- `GET /api/patients/{id}/clinical` — agrège les tables SQL en un bundle JSON (même forme que l'import `POST /api/patients/import`).
- Implémentation : `patient_clinical_read.find_clinical_bundle` ; `GetPatientClinicalBundleUseCase` ; `PatientService.get_patient_clinical`.

Radio, imagerie et chirurgie sont rattachées à un cancer via `primary_cancer_id` lorsque la migration `002` est appliquée. Les enregistrements sans FK restent au niveau patient (`surgery[]` racine) ou sont rattachés au premier `primaryCancer` pour l'imagerie / la radiothérapie orphelines (compatibilité données historiques).

### Écriture (CRUD par section)

Routeur : `app/routers/patient_clinical.py` — service : `PatientClinicalService` — persistance : `patient_clinical_write.SqlPatientClinicalWriteRepository`.

Toutes les routes exigent un JWT **clinician** ou **admin** et respectent la même politique d'accès patient que le reste de l'API (`patient_profile_policy.assert_can_access_patient`).

Les réponses POST/PUT incluent un champ `id` (et `primaryCancerId` le cas échéant) en plus des champs métier.

| Section | POST | PUT | DELETE |
|---------|------|-----|--------|
| Mesures | `/clinical/measures` | `/clinical/measures/{measure_id}` | idem |
| Médicaments | `/clinical/medications` | `/clinical/medications/{medication_id}` | idem |
| Chirurgies | `/clinical/surgeries` | `/clinical/surgeries/{surgery_id}` | idem |
| Radiothérapie | `/clinical/radiotherapies` | `/clinical/radiotherapies/{radiotherapy_id}` | idem |
| Imagerie | `/clinical/imaging-studies` | `/clinical/imaging-studies/{imaging_id}` | idem |
| TNM | `/clinical/primary-cancers/{primary_cancer_id}/tnm-events` | `.../tnm-events/{tnm_id}` | idem |
| Prélèvements | `/clinical/specimens` | `/clinical/specimens/{specimen_id}` | idem |
| Biomarqueurs | `/clinical/specimens/{specimen_id}/biomarkers` | `.../biomarkers/{biomarker_id}` | idem |

Corps chirurgie / radio / imagerie : schémas `SurgeryWriteIn`, `RadiotherapyWriteIn`, `ImagingStudyWriteIn` — champ optionnel `primaryCancerId` pour lier un cancer primitif.

Import JSON patient (`POST /api/patients/import`) : lors de la synchro des `primaryCancer[]`, les listes `surgery`, `radiotherapy` et `imaging` imbriquées sont insérées avec le `primary_cancer_id` correspondant (`patient_repository`).

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
- `GET /api/patients/{id}/clinical` — bundle clinique structuré (voir section ci-dessus)
- `GET /api/patients/{id}/profile`
- `PUT /api/patients/{id}/profile`

### Dossier clinique — CRUD sectionnel (clinician / admin)

Préfixe commun : `/api/patients/{patient_id}/clinical/...` (détail des chemins dans la section **Dossier clinique structuré**). Tag OpenAPI : `patient-clinical`.

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
| `use_cases/get_patient_clinical.py` | GET bundle clinique |
| `services/patient_clinical_service.py` | CRUD sectionnel + contrôle d'accès |
| `repositories/patient_clinical_read.py` | SQL → `PatientClinicalDataIn` |
| `repositories/patient_clinical_write.py` | INSERT/UPDATE/DELETE par section |
| `use_cases/stream_llm_sse.py` | Itération événements SSE |
| `ports/llm_ports.py` | `LlmPort`, `LlmSsePort` |
| `deps.py` | Injection FastAPI (`get_patient_service`, `get_patient_clinical_service`, …) |

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
pytest tests/test_patient_clinical_read_unit.py tests/test_patient_clinical_crud_unit.py -v
```

Tests clinique : mocks SQL (`patient_clinical_read`) et mocks repository (`PatientClinicalService`) — **pas de PostgreSQL requis** pour ces fichiers.

En CI (GitHub Actions), la suite complète s'exécute avec PostgreSQL 16 (`scripts/ci-init-db.sh` → `setup_database.sql`). Imports de tests : préfixe `backend_fastapi.app...` (racine du dépôt = working directory pytest).

Couverture : variable selon les modules exercés et l'accès DB / LLM ; viser une suite verte locale avec `pytest --benchmark-disable` avant push.

## Notes d'implémentation

- Routes HTTP fines → services ou cas d'usage.
- Erreurs métier : `ApplicationError` (`status_code`, `detail`).
- Cache court sur `find_by_id` utilisateur (`USER_CACHE_TTL_SECONDS`).
