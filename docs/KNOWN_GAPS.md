# Lacunes connues (gap analysis)

Analyse honnête de l'écart entre l'état actuel et un produit **déployable en environnement clinique**.  
Complète votre grille de maturité (~5,5/10 global).

---

## Synthèse par dimension

### Architecture backend — 7/10 ✅ Point fort

**Ce qui est solide**

- Couches `domain` / `application` / `infrastructure` / `routers` réellement appliquées.
- Services métier testables (`AuthService`, `PatientService`, `ArgosService`, `AiService`).
- Ports LLM, injection via `deps.py`.
- Erreurs métier unifiées (`ApplicationError`).

**À renforcer**

- Pattern transaction `DbUnitOfWork` : en place pour profil patient, ARGOS et `create_biomarker` ; à généraliser aux autres écritures multi-étapes du dépôt clinique.
- Frontières `PatientService` / `PatientClinicalService` : documentées dans [`backend_fastapi/docs/SERVICE_BOUNDARIES.md`](../backend_fastapi/docs/SERVICE_BOUNDARIES.md) — à maintenir à chaque nouvel endpoint.

---

### Données & migrations — 7/10 ✅ Point fort

**Ce qui est solide**

- Alembic = source de vérité schéma.
- CI teste réversibilité migrations (`downgrade -1` / `upgrade head`).
- Seeds idempotents avec vrais hashes bcrypt.

**À renforcer**

- Pas de stratégie documentée de **migration de données prod** (gros volumes, rollback).
- Pas de backup / restore runbook dans le repo.

---

### Sécurité — 6/10 ⚠️

**Ce qui est solide**

- JWT access + refresh HttpOnly.
- Lockout login (throttle).
- RBAC sur routes sensibles.
- Prompt safety + audit IA côté backend.
- Frontend : token access en mémoire, intercepteur refresh 401.

**Lacunes**

| Gap | Impact | Priorité |
|-----|--------|----------|
| `ForgotPassword` = écran placeholder, pas d'API | UX / sécurité perçue | H1 |
| Pas de rotation / révocation refresh tokens côté serveur | Session compromise non invalidable finement | H2 |
| Pas de MFA | Exigence hôpital fréquente | H3 |
| `ALLOW_DEMO_PASSWORD_FALLBACK` — doit rester `false` partout prod | Risque critique si mal configuré | Continu |
| Données patient en `localStorage` (draft profil) | Fuite sur poste partagé | H1 (UX + avertissement) |

---

### Tests & CI — 6,5/10 ⚠️

**Ce qui est solide**

- ~38 fichiers pytest, tests intégration DB.
- 19 fichiers tests frontend Vitest.
- 2 specs Playwright (ARGOS, session auth).
- Seuil couverture backend 65 % + modules critiques 80 %.
- CI : typecheck, ESLint, Ruff, build, E2E.

**Lacunes**

| Gap | Impact |
|-----|--------|
| Couverture frontend **non seuillée** en CI | Régressions UI probables |
| E2E ne couvre pas profil autosave ni admin assign | Parcours métier partiels |
| Tests intégration skippés sans DB locale | Développeurs peuvent ignorer les échecs |
| Pas de tests de charge / perf API | Risque avant pilote |

---

### Frontend — 4/10 → ~5/10 🔴 Point faible relatif

**Progrès récents**

- `PatientFile.tsx` découpé (~200 lignes) + `usePatientReport`.
- `strictNullChecks`, ESLint sur `client/`.
- Auth refresh session.

**Lacunes majeures**

| Gap | Fichier / zone | Priorité |
|-----|----------------|----------|
| ~~ARGOS historique en `localStorage`~~ | `useArgosHistory.ts` | **P0** — 🟢 fait (PR #14) |
| ~~**Patients fictifs dans ARGOS**~~ | `ArgosSpace.tsx` | **P1** — 🟢 `GET /api/patients` via `useArgosPatients` |
| ~~Pas de couche cache serveur unifiée (React Query)~~ | Patients, profil, bundle, ARGOS | **P1** — 🟢 hooks `queries/` + mutations ARGOS |
| `strict: false` (seul `strictNullChecks`) | `tsconfig.json` | P2 |
| ~~Mélange FR/EN dans l'UI (pages critiques + layout)~~ | Global | **P1** — 🟢 `fr.ts` + Header/Sidebar/Settings |
| Beaucoup de composants shadcn non testés | `components/ui/` | P2 |
| État formulaire PatientFile très verbeux | `usePatientReport.ts` | P2 |

---

### Prod / entreprise — 3/10 🔴

**Absent aujourd'hui**

- Observabilité (metrics, tracing, alerting).
- Logs structurés exportables (ELK, Datadog…).
- Runbooks incident / disaster recovery.
- Documentation conformité RGPD / HDS.
- Pipeline déploiement versionné (staging → prod).
- Feature flags centralisés.

**Minimum viable labo (H2)**

- Health checks documentés.
- Variables d'env validées au démarrage.
- Guide déploiement avec checklist sécurité.

---

### Cohérence produit — 5/10 ⚠️

**Incohérences actives**

| Domaine | Comportement actuel | Comportement cible |
|---------|---------------------|-------------------|
| Historique ARGOS | API (source de vérité) | API seule — 🟢 fait |
| Liste patients ARGOS | `GET /api/patients` | API `/api/patients` — 🟢 fait |
| Profil patient | Draft local prioritaire si présent | Badge brouillon / synchronisé (ADR-006) — 🟡 partiel |
| Discussions ARGOS « générales » | Locales seulement | Décision produit à trancher |
| Rapport IA | Stream réel OU fallback local silencieux | Indicateur clair « simulé » vs « IA » |

---

## Matrice risque × effort (priorisation PO)

```text
Impact utilisateur élevé, effort modéré :
  → P0 ARGOS persistance API
  → P1 ARGOS vrais patients
  → P1 clarté sync profil patient

Impact conformité, effort élevé :
  → H2 observabilité, traçabilité IA
  → H3 SSO, HDS

Dette technique, effort faible :
  → i18n policy, seuil couverture frontend, supprimer routes mortes
```

---

## Validation de votre auto-évaluation

Votre score **~5,5/10** est **cohérent** avec le code :

- Le backend est **en avance** sur le frontend.
- La CI est **au-dessus de la moyenne** pour un projet de cette taille.
- Les gaps **prod** et **cohérence ARGOS** plafonnent le score global.
- Après livraison P0+P1 (roadmap H0–H1), un score **~6,5–7/10** est réaliste en 2–3 mois.

---

## Liens

- Plan d'action : [ROADMAP.md](ROADMAP.md)
- État fonctionnel : [PROJECT_STATE.md](PROJECT_STATE.md)
- Décisions : [DECISIONS.md](DECISIONS.md)
