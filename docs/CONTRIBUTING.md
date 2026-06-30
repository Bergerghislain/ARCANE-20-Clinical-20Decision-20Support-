# Contribuer à ARCANE

Guide pour proposer des changements de manière alignée avec l'équipe et la CI.

---

## Workflow Git

1. Partir de `main` à jour.
2. Branche courte : `feat/...`, `fix/...`, `refactor/...`, `chore/...`, `docs/...`.
3. Commits atomiques avec message clair (impératif, en français ou anglais — rester cohérent dans la PR).
4. Ouvrir une **Pull Request** vers `main`.
5. CI verte obligatoire avant merge (voir protection branche : [GITHUB_BRANCH_PROTECTION.md](GITHUB_BRANCH_PROTECTION.md)).

---

## Avant de pousser

### Frontend

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
```

### Backend

```bash
ruff check backend_fastapi
cd backend_fastapi && python -m pytest tests -q --benchmark-disable
```

### Si vous touchez un parcours utilisateur

```bash
pnpm run test:e2e:install   # une fois
pnpm run test:e2e
```

---

## Règles de qualité

| Règle | Détail |
|-------|--------|
| Pas de secret dans le repo | `.env` gitignoré ; utiliser `.env.example` |
| Tests sur logique métier | Service backend ou hook/lib frontend |
| Pas de `localStorage` pour données serveur | Sauf draft profil documenté |
| Migrations pour tout changement SQL | Alembic, jamais DDL manuel silencieux |
| `apiFetch` côté client | Pas de `fetch` direct vers l'API métier |
| Scope minimal | Une PR = un sujet reviewable |

---

## Structure d'une PR

```markdown
## Summary
- ...

## Test plan
- [ ] ...
```

---

## Revue de code — points d'attention

**Backend**

- Le routeur délègue au service ?
- `ApplicationError` avec bon code HTTP ?
- RBAC vérifié pour données patient d'un autre clinicien ?

**Frontend**

- État serveur rechargé après mutation ?
- Gestion erreur visible pour l'utilisateur ?
- Pas de régression auth (cookie + token mémoire) ?

**Produit**

- Comportement documenté dans [PROJECT_STATE.md](PROJECT_STATE.md) si changement visible ?

---

## Documentation

Tout changement durable doit mettre à jour :

- [PROJECT_STATE.md](PROJECT_STATE.md) — comportement
- [DECISIONS.md](DECISIONS.md) — choix structurants
- [ROADMAP.md](ROADMAP.md) — statut des items
- [KNOWN_GAPS.md](KNOWN_GAPS.md) — si un gap est comblé

---

## Environnement

Reproduire la CI localement :

```bash
powershell -File scripts/ci-init-db.ps1   # Windows
pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build
cd backend_fastapi && ruff check . && python -m pytest tests -q --benchmark-disable
```

Voir [ONBOARDING.md](ONBOARDING.md) pour le setup initial.
