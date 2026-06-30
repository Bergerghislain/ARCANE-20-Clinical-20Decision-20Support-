# Guide backend ARCANE

Complément court à [`backend_fastapi/README.md`](../backend_fastapi/README.md) et [`ARCHITECTURE_SOLID_DDD.md`](../backend_fastapi/ARCHITECTURE_SOLID_DDD.md).

---

## Démarrage rapide

```bash
cd backend_fastapi
alembic upgrade head
cd ..
python backend_fastapi/scripts/seed_demo.py
pnpm run dev:api
```

API : http://localhost:8000 — OpenAPI : http://localhost:8000/docs

---

## Ajouter un endpoint (checklist)

1. **Schémas** Pydantic dans `app/schemas.py` (`*In`, `*Out`).
2. **Port** si nouveau repository (`application/ports/`).
3. **Repository** SQL dans `infrastructure/repositories/`.
4. **Service** dans `application/services/` — lève `ApplicationError` pour erreurs métier.
5. **Routeur** fin dans `routers/` — pas de logique métier lourde.
6. **DI** : factory dans `deps.py`.
7. **Tests** : unit (service mocké) + intégration HTTP si DB.

---

## Erreurs métier

```python
from ..application.errors import ApplicationError

raise ApplicationError("Patient not found", 404)
```

Le routeur convertit en `HTTPException`.

---

## Auth & RBAC

- Dépendance `ClinicianUser` / admin dans `deps.py`.
- Vérifier le rôle dans le **service** pour la logique, dans le **routeur** pour les routes admin-only.
- Tests RBAC : `tests/test_rbac_access.py`.

---

## ARGOS

| Endpoint | Service |
|----------|---------|
| `POST /api/argos/discussions` | `ArgosService.create_discussion` |
| `GET .../messages` | `ArgosService.list_messages` |
| `POST .../messages` | `ArgosService.add_message` |

Repository : `SqlArgosRepository`. Tests intégration : `test_argos_repository_integration.py`, `test_argos_router_integration.py` (si présent).

---

## IA

| Provider | Usage |
|----------|-------|
| `disabled` | 503 |
| `mock_json` | CI, démos sans GPU |
| `openai_compatible` | vLLM / Qwen |

Fichiers : `infrastructure/ai/`, `application/services/ai_service.py`.

Voir [QWEN_INTEGRATION.md](QWEN_INTEGRATION.md).

---

## Migrations

```bash
cd backend_fastapi
alembic revision -m "description"
alembic upgrade head
```

Ne jamais modifier le schéma à la main en prod sans migration.

---

## Tests

```bash
cd backend_fastapi
ruff check .
python -m pytest tests -q --benchmark-disable
```

Tests marqués `integration` : nécessitent PostgreSQL + seeds.

`conftest.py` skip automatique si DB indisponible.

---

## Lint

Ruff configuré dans `ruff.toml` (racine). CI : `ruff check backend_fastapi`.

---

## Variables d'environnement critiques

| Variable | Rôle |
|----------|------|
| `JWT_SECRET` | Signature tokens |
| `DB_*` | PostgreSQL |
| `CORS_ORIGINS` | Origines frontend autorisées |
| `LLM_PROVIDER` | Comportement IA |
| `ALLOW_DEMO_PASSWORD_FALLBACK` | **false** en prod |

Liste complète : `.env.example`, `app/settings.py`.

---

## Checklist avant PR backend

- [ ] `ruff check backend_fastapi`
- [ ] `pytest` vert (avec DB si intégration)
- [ ] Migration Alembic si changement schéma
- [ ] Pas de secret dans le code
- [ ] `ApplicationError` pour erreurs métier (pas d'exception générique)
