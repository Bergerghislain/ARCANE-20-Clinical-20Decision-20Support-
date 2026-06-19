# AGENTS.md

## Cursor Cloud specific instructions

ARCANE is a single product (clinical decision support for rare cancers) with three tiers:
- **Frontend**: React/TypeScript SPA (Vite), package manager **pnpm**. Dev server on port **8080** (proxies `/api` → `127.0.0.1:8000`).
- **Backend**: FastAPI (`backend_fastapi/`), Python, served by Uvicorn on port **8000**. This is the only active backend (the legacy Express backend is deprecated).
- **Database**: PostgreSQL 16 (`arcane` db).

Standard commands live in `package.json` (`dev`, `dev:api`, `build`, `test`, `typecheck`), `backend_fastapi/README.md`, and `.github/workflows/ci.yml`. Notes below are the non-obvious caveats.

### Services / startup
- **PostgreSQL is NOT running on VM startup.** Start it before backend work or backend/integration tests:
  `sudo pg_ctlcluster 16 main start`
  The cluster, the `arcane` database, applied Alembic migrations, and demo seeds persist in the VM snapshot (data dir `/var/lib/postgresql/16/main`). Local DB creds: user `postgres` / password `postgres`, db `arcane`.
- **Backend** (port 8000): `pnpm run dev:api`  (= `python -m uvicorn backend_fastapi.app.main:app --reload --port 8000`).
- **Frontend** (port 8080): `pnpm run dev`. Open http://localhost:8080/.
- The app auto-loads env from `backend_fastapi/.env` then the root **`.env`** (root wins). A root `.env` (gitignored) is required and already present in the snapshot with local DB creds, `JWT_SECRET`, `LLM_PROVIDER=mock_json`, and `ALLOW_DEMO_PASSWORD_FALLBACK=false`. If it is missing after a fresh clone, recreate it from `.env.example` with the creds above.

### Demo data / auth
- Seeded login: **`admin` / `password`** (all seeded users default to password `password`).
- Login API: `POST /api/auth/login` expects field **`identifier`** (not `username`); the JWT is returned in the **`token`** field (not `access_token`).
- Re-initialize schema + seeds anytime (idempotent): `bash scripts/ci-init-db.sh` (runs `alembic upgrade head` + `seed_demo.py`).

### Tests / checks
- Frontend: `pnpm run typecheck` and `pnpm run test` (Vitest). No ESLint — `tsc` + Prettier are the gates. Vitest only runs `client/`+`shared/` specs; the Playwright E2E specs live in `e2e/` and are excluded from Vitest.
- Backend: requires PostgreSQL running and env loaded. Run from repo root:
  `set -a; . ./.env; set +a; python -m pytest backend_fastapi/tests --benchmark-disable`
- **Coverage gate**: `.coveragerc` sets a blocking `fail_under=70`. The full suite (with integration tests) needs PostgreSQL — that's what CI runs. Without a DB the integration tests are skipped and coverage drops under the gate (expected).
- **E2E (Playwright)**: `pnpm run test:e2e`. The config's `webServer` runs `pnpm run start` (uvicorn serving the built SPA + API on :8000), so first `pnpm run build`; locally it reuses an already-running :8000 server. Needs a browser once: `pnpm exec playwright install chromium` (binary persists in the VM snapshot). Use `LLM_PROVIDER=mock_json` for deterministic ARGOS responses. Override the target with `E2E_BASE_URL` (e.g. the Vite dev server on :8080).
- `python` is symlinked to `python3` (project scripts call `python`). Python deps are installed into the system interpreter with `pip --break-system-packages`.
- The LLM model server is optional; `LLM_PROVIDER=mock_json` exercises AI flows without any external model. Real mode (`openai_compatible`) has retries + a circuit breaker and is covered by integration tests using `httpx.MockTransport`.
