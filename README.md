# ARCANE - Plateforme d'aide a la decision clinique

ARCANE est une plateforme clinique centree sur les cancers rares.  
Le projet combine:
- un **frontend React/TypeScript** (dashboard patient, dossier patient, espace ARGOS),
- un **backend FastAPI** (authentification, patients, administration, ARGOS),
- une base **PostgreSQL**.

Le backend Express historique n'est plus utilise: **FastAPI est l'unique backend actif**.

## Etat actuel du projet (mise a jour)

### Backend
- Refactorisation appliquee selon une architecture `domain` / `application` / `infrastructure` / `routers`.
- Services metier centralises (`AuthService`, `AdminService`, `PatientService`, `ArgosService`).
- Injection de dependances centralisee (`backend_fastapi/app/deps.py`).
- Endpoints patient enrichis avec la persistence de profil:
  - `GET /api/patients/{id}/profile`
  - `PUT /api/patients/{id}/profile`
- Endpoints utilises par le Patient Handler admin:
  - `GET /api/patients`
  - `GET /api/admin/users?status=ACTIF|EN_ATTENTE`
  - `POST /api/patients/{id}/assign`
- Gestion d'erreurs metier uniformisee via `ApplicationError`.

### Frontend
- Dashboard patient avec recherche, filtres et import JSON.
- Dossier patient par onglets (`Patient Infos`, `Report`, `ARGOS`).
- Vue admin `Patient Handler` exposee sur `/admin/patient-handler` pour reaffecter un patient a un clinicien.
- Generation de rapport IA simulee (conclusion, raisonnement, sources).
- Transfert automatique du contexte patient vers ARGOS.
- Validation de profil patient via schema Zod (`schemaVersion`).
- Persistence hybride des saisies:
  - draft local (`localStorage`)
  - synchro backend via API profil patient.

### Tests
- Frontend: tests unitaires + tests de flux composant (Vitest + Testing Library).
- Backend: tests integration FastAPI (auth, admin, patients).
- Dernier run backend local: **21 tests passes**.

## Stack technique

- **Frontend**: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Vitest.
- **Backend**: FastAPI, Pydantic v2, psycopg, passlib/bcrypt, JWT (python-jose).
- **DB**: PostgreSQL.

## Structure du depot

```text
client/                Frontend React/TypeScript
backend_fastapi/       API FastAPI + architecture metier
shared/                Code partage frontend
public/patient-reports/ JSON de simulation patient/report
setup_database.sql     Schema SQL principal
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
- Creer la base `arcane`.
- Executer `setup_database.sql` (script SQL unique).
- Le script inclut deja les evolutions recentes (`birth_date`, `birth_date_precision`) et l'assignation obligatoire d'un clinicien par patient.

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

## Commandes de test

### Frontend
```bash
pnpm run typecheck
pnpm run test
pnpm run test -- --coverage
```

### Backend
```bash
python -m pytest backend_fastapi/tests -q
python -m pytest backend_fastapi/tests --cov=backend_fastapi/app --cov-report=term-missing
```

## Notes de couverture (snapshot local recent)

- Couverture backend (`backend_fastapi/app`): **68%**.
- Couverture elevee sur les flux dashboard/patient frontend, mais couverture globale frontend encore basse car de nombreux modules UI/pages ne sont pas encore testes.

## Documentation utile

- Architecture backend SOLID/DDD: `backend_fastapi/ARCHITECTURE_SOLID_DDD.md`
- README backend detaille: `backend_fastapi/README.md`

## Limitations connues / prochaines etapes

- Les reponses IA sont encore simulees (JSON local + generation mock).
- La persistence profil est actuellement stockee dans `health_info.manual_profile` cote patient (etape intermediaire).
- Objectif recommande: ajouter une table dediee de profils patients, renforcer les tests Argos backend et augmenter la couverture de la couche infrastructure SQL.
