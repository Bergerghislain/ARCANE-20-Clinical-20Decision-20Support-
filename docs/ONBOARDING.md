# Prise en main ARCANE (onboarding développeur)

Guide pour être opérationnel sur le projet en **1 journée** (setup) puis **1 semaine** (première contribution).

**Dernière mise à jour** : juillet 2026

## Contexte produit (30 secondes)

ARCANE est une plateforme d'**aide à la décision clinique** pour les **cancers rares**. Les cliniciens :

1. consultent et enrichissent des **dossiers patients** ;
2. génèrent des **rapports IA** structurés ;
3. discutent avec **ARGOS**, l'assistant de raisonnement clinique.

Le backend est la **source de vérité** pour les données persistées. Le frontend est une SPA React servie en dev via Vite (port 8080) avec proxy vers FastAPI (port 8000).

**Objectif long terme** : pilote puis déploiement hospitalier — voir [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md).

---

## Jour 1 — Environnement local

### Prérequis

- Node.js 20+, pnpm
- Python 3.12+
- PostgreSQL (local ou Docker)
- Git

### Installation

```bash
git clone https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-.git
cd ARCANE-20-Clinical-20Decision-20Support-

pnpm install
python -m pip install -r backend_fastapi/requirements.txt
```

Copier `.env.example` → `.env` à la racine. Minimum : `JWT_SECRET`, variables `DB_*`.

Pour un LLM local (optionnel) : voir `.env.example` (Ollama, Groq) et [QWEN_INTEGRATION.md](QWEN_INTEGRATION.md).

### Base de données

```bash
# Windows
powershell -File scripts/ci-init-db.ps1

# Linux / macOS
bash scripts/ci-init-db.sh
```

Équivalent manuel :

```bash
cd backend_fastapi && alembic upgrade head && cd ..
python backend_fastapi/scripts/seed_demo.py
```

### Lancer l'application

Terminal 1 :

```bash
pnpm run dev:api
```

Terminal 2 :

```bash
pnpm run dev
```

- Frontend : http://localhost:8080  
- API : http://localhost:8000  
- Login démo : `admin@arcane.com` / `password`

### Vérifier que tout fonctionne

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
cd backend_fastapi && python -m pytest tests -q --benchmark-disable
pnpm exec playwright test   # optionnel — nécessite Chromium installé
```

Les tests d'intégration backend sont **skippés** si PostgreSQL n'est pas migré + seedé.

---

## Jour 2–3 — Explorer le code

### Carte mentale

```text
Navigateur (React)
    ↓ apiFetch (client/lib/api.ts) + cookie refresh
FastAPI routers (app/routers/)
    ↓
Services (app/application/services/)
    ↓
Repositories SQL (app/infrastructure/repositories/)
    ↓
PostgreSQL
```

### Fichiers à lire en premier

| Fichier | Pourquoi |
|---------|----------|
| `client/App.tsx` | Routes et garde d'authentification |
| `client/lib/api.ts` | Tous les appels HTTP + refresh 401 |
| `client/lib/auth.ts` | Session (token mémoire, refresh cookie) |
| `client/lib/argosSession.ts` | Persistance session ARGOS (F5) |
| `backend_fastapi/app/main.py` | Montage des routeurs |
| `backend_fastapi/app/deps.py` | Injection de dépendances |
| `client/pages/Dashboard.tsx` | Liste patients |
| `client/pages/PatientFile.tsx` | Dossier patient (orchestrateur) |
| `client/pages/ArgosSpace.tsx` | Assistant ARGOS |

### Parcours utilisateur à tester manuellement

1. Login → Dashboard → ouvrir un patient.
2. Modifier le profil → vérifier autosave (draft local + API).
3. Générer un rapport (onglet Report).
4. Ouvrir ARGOS → sélectionner un patient seed (ex. Jean Dupont) → New Chat.
5. Envoyer un message → **F5** → vérifier que la discussion et l'input chat réapparaissent.
6. (Admin) `/admin/patient-handler` — réaffecter un patient.

---

## Semaine 1 — Première contribution

1. Lire [CONTRIBUTING.md](../CONTRIBUTING.md) (branches, CI).
2. Choisir un item **P1** dans [ROADMAP.md](ROADMAP.md) ou une issue `p1` / `hospital`.
3. Créer une branche `feat/...` ou `fix/...`.
4. Ajouter ou adapter des tests (Vitest ou pytest).
5. Ouvrir une PR ; la CI doit être verte (frontend + backend + E2E).

### Comptes seeds utiles

| Email | Rôle | Usage |
|-------|------|--------|
| `admin@arcane.com` | admin | Tout + admin UI |
| `martin@hospital.com` | clinician | PAT001 assigné |
| `leclerc@hospital.com` | clinician | Autres patients |
| `jane@research.com` | researcher | Accès limité (tests RBAC) |

Mot de passe seeds : `password` (hash bcrypt réel).

---

## Tests E2E (Playwright)

| Spec | Parcours |
|------|----------|
| `e2e/argos-flow.spec.ts` | Login → ARGOS patient API → message → F5 |
| `e2e/auth-session.spec.ts` | Refresh token, expiration |

Lancer : `pnpm exec playwright test` (les serveurs sont démarrés par `playwright.config.ts` en CI).

---

## Pièges fréquents

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| 401 sur toutes les routes | Pas de login ou token expiré sans cookie refresh | Se reconnecter ; vérifier `credentials: include` |
| Tests intégration skippés | DB vide ou non seedée | `ci-init-db` |
| ARGOS vide après F5 | Session non restaurée (bug régressif) | Vérifier `argosSession.ts` + sync API dans `ArgosSpace.tsx` |
| IA ne répond pas | `LLM_PROVIDER=disabled` | `mock_json` ou `openai_compatible` — voir [QWEN_INTEGRATION.md](QWEN_INTEGRATION.md) |
| Port 8000 déjà utilisé | API locale en arrière-plan | Arrêter le processus ou `reuseExistingServer` Playwright |
| E2E login échoue localement | Token CI expire en 5 s si mauvais serveur réutilisé | Lancer avec `CI=true` ou libérer le port 8000 |

---

## Déploiement labo / hôpital

| Niveau | Document |
|--------|----------|
| Labo (réseau interne) | [LABO_SECURITY.md](LABO_SECURITY.md) |
| Checklist pilote hospitalier | [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md) |
| Lacunes connues | [KNOWN_GAPS.md](KNOWN_GAPS.md) |
| Backlog issues GitHub | [GITHUB_ISSUES_HOSPITAL.md](GITHUB_ISSUES_HOSPITAL.md) |

---

## Qui contacter / où chercher

- État fonctionnel : [PROJECT_STATE.md](PROJECT_STATE.md)
- Lacunes connues : [KNOWN_GAPS.md](KNOWN_GAPS.md)
- Roadmap : [ROADMAP.md](ROADMAP.md)
- i18n : [I18N_INVENTORY.md](I18N_INVENTORY.md)
- API détaillée : `backend_fastapi/README.md`
