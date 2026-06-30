# Sprint 1 — Stabilisation ARGOS & cohérence données

| Champ | Valeur |
|-------|-------|
| **Période** | 2 semaines — à adapter à votre date de démarrage |
| **Objectif sprint** | Livrer ARGOS fiable (historique API) + merger l'état stable sur `main` |
| **Jalon visé** | **M1** — démo clinique sans bug historique |
| **Template** | [SPRINT_TEMPLATE.md](SPRINT_TEMPLATE.md) |

---

## Objectif produit

Un clinicien peut :

1. se connecter ;
2. ouvrir ARGOS pour un patient avec ID backend ;
3. créer une discussion et envoyer un message ;
4. **recharger la page (F5)** et retrouver **exactement le même historique**.

---

## Périmètre IN

| ID | Issue | Titre | Statut |
|----|-------|-------|--------|
| P0.1 | [# à créer](GITHUB_ISSUES.md) | ARGOS : API seule source de vérité | 🟡 Code prêt — PR à merger |
| P0.2 | — | Auth refresh automatique | 🟢 Fait |
| P0.3 | — | PatientFile découpage phase 1 | 🟢 Fait |
| P0.4 | — | ESLint + Ruff + strictNullChecks | 🟢 Fait |
| P0.5 | [# à créer](GITHUB_ISSUES.md) | Aligner `main` + doc | 🔴 À faire |

### Critères d'acceptation (Definition of Done)

- [ ] `useArgosHistory` : **aucune** lecture/écriture `argos_conversations` dans localStorage
- [ ] Au montage de `/argos` : `GET /api/argos/discussions` puis messages par discussion
- [ ] Nouvelle discussion patient : `POST /api/argos/discussions` **avant** affichage UI
- [ ] Messages user/assistant : `POST .../messages` (await, erreur visible si échec)
- [ ] `backend_fastapi/tests/test_argos_router_integration.py` : 3 tests verts en CI
- [ ] `client/lib/argosMappers.test.ts` + `ArgosSpace.test.tsx` verts
- [ ] Test manuel F5 validé
- [ ] `PROJECT_STATE.md` + `DECISIONS.md` ADR-007 mis à jour
- [ ] PR mergée ; issue P0.1 fermée (`Fixes #N`)

---

## Périmètre OUT (sprint suivant)

| Item | Raison |
|------|--------|
| P1.1 mockPatients → API | Hors scope stabilisation |
| P1.2 draft profil UX | Hors scope |
| i18n complet | Hors scope |
| React Query | Hors scope |

---

## Plan d'exécution suggéré

| Phase | Actions |
|-------|---------|
| **J1** | `gh auth login` → `bash scripts/create-github-issues.sh` → créer branche `fix/argos-api-source-of-truth` |
| **J2–J4** | Vérifier PR P0.1, revue code, tests locaux avec `ci-init-db` |
| **J5** | Merge → fermer issue → démo interne |
| **J6–J8** | P0.5 : audit `main` vs doc, merge branches restantes |
| **J9–J10** | Rétro + planifier sprint 2 (P1.1, P1.6 E2E ARGOS reload) |

---

## Démo script (10 min)

1. Login `martin@hospital.com` / `password`
2. Aller sur `/argos`
3. Sélectionner un patient (ID numérique seed, ex. patient lié à PAT001)
4. Nouvelle discussion → envoyer : « Quelle est la prochaine étape ? »
5. Attendre réponse ARGOS (mock ou LLM)
6. **F5** — vérifier messages identiques
7. Ouvrir DevTools → Application → localStorage : **pas** de clé `argos_conversations`

---

## Commandes utiles

```bash
# Créer les issues GitHub
bash scripts/create-github-issues.sh
# ou : powershell -File scripts/create-github-issues.ps1

# Branche + tests locaux
git checkout -b fix/argos-api-source-of-truth
powershell -File scripts/ci-init-db.ps1
pnpm run test
cd backend_fastapi && python -m pytest tests/test_argos_router_integration.py -v --no-cov

# PR
git push -u origin fix/argos-api-source-of-truth
gh pr create --title "fix(argos): API comme source de vérité historique" --body "Fixes #N"
```

---

## Rétrospective (à remplir)

### Bien

-

### Bloqué

-

### Sprint 2 (proposition)

- P1.1 ARGOS vrais patients
- P1.6 E2E reload ARGOS automatisé
- P1.2 indicateurs sync profil
