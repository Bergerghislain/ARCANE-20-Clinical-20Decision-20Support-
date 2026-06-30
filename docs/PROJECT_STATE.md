# État du projet (référence « stable »)

Snapshot pour savoir ce qui est **fiable aujourd'hui** avant d'améliorer ou déployer.  
**Index doc** : [README.md](README.md) · **Roadmap** : [ROADMAP.md](ROADMAP.md) · **Lacunes** : [KNOWN_GAPS.md](KNOWN_GAPS.md)

Dernière mise à jour : mars 2026.

---

## Périmètre

- **Frontend** : `client/` (React + TypeScript + Vite)
- **Backend** : `backend_fastapi/` (FastAPI)
- **Base** : PostgreSQL (Alembic + `scripts/seed_demo.py`)

---

## Maturité globale estimée : ~5,5 / 10

Backend et CI au-dessus de la moyenne ; frontend et prod-ready en retard. Détail : [KNOWN_GAPS.md](KNOWN_GAPS.md).

---

## Fonctionnalités fiables

### Authentification

- `POST /api/auth/login`, `refresh`, `logout`, `register`
- Cookie refresh HttpOnly (`COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`)
- **Frontend** : access token en mémoire ; intercepteur 401 → refresh → retry (`client/lib/api.ts`) ; bootstrap au chargement (`App.tsx`)

### Rôles

- `admin`, `clinician`, `researcher` — RBAC routes/services

### Patients

- CRUD, pagination, profil JSON (`patient_profiles`)
- Assignation clinicien (admin)
- Bundle clinique structuré `GET /api/patients/{id}/clinical` + CRUD sections

### Dossier patient (UI)

- `PatientFile.tsx` orchestrateur (~200 lignes)
- Logique : `usePatientReport`, `usePatientClinicalBundle`
- UI : `components/patient-file/*`
- Autosave profil : draft `localStorage` + API

### ARGOS

- API : discussions + messages persistés PostgreSQL
- Frontend : historique chargé via **API** (`useArgosHistory` + `argosMappers`) — plus de `localStorage` pour les conversations (P0.1 livré en code, merge PR en attente)
- `ArgosSpace` : liste patients **mockée** (pas encore `/api/patients`) — P1

### IA

- Providers : `disabled` | `mock_json` | `openai_compatible`
- Streaming SSE rapport ; prompt safety, audit, schémas JSON stricts côté backend
- Fallback mock frontend si `VITE_ARGOS_MOCK_FALLBACK=true`

### Admin

- `/admin/users`, `/admin/patient-handler`

---

## Outillage & CI

| Outil | Scope |
|-------|--------|
| TypeScript `strictNullChecks` | `client/` |
| ESLint | `client/` (`pnpm run lint`) |
| Ruff | `backend_fastapi/` |
| Vitest | ~19 fichiers tests frontend |
| Pytest | ~38 fichiers tests backend |
| Playwright | `e2e/argos-flow.spec.ts`, `e2e/auth-session.spec.ts` |

Workflow : `.github/workflows/ci.yml` (frontend + backend + e2e).

---

## Variables d'environnement sensibles

Voir `.env.example` et [LABO_SECURITY.md](LABO_SECURITY.md).

- `JWT_SECRET` — obligatoire en prod
- `ALLOW_DEMO_PASSWORD_FALLBACK=false`
- `LLM_API_KEY` — backend uniquement

---

## Base de données

- Schéma : `alembic upgrade head`
- Seeds : `python backend_fastapi/scripts/seed_demo.py`
- Init type CI : `scripts/ci-init-db.ps1` / `.sh`

---

## Limites connues (résumé)

1. ARGOS : patients fictifs dans l'UI (P1).
2. Mot de passe oublié : écran sans API.
3. Pas d'observabilité prod (logs structurés, metrics).
4. Couverture frontend non seuillée en CI.
5. i18n mixte FR/EN.

Liste complète : [KNOWN_GAPS.md](KNOWN_GAPS.md).

---

## Prochaines étapes recommandées

Voir [ROADMAP.md](ROADMAP.md) et [SPRINT_CURRENT.md](SPRINT_CURRENT.md) — merger P0.1 puis P0.5 alignement `main`.
