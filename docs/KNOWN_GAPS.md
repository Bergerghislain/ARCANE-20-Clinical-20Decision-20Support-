# Lacunes connues (gap analysis)

Analyse honnête de l'écart entre l'état actuel et un produit **déployable en environnement clinique hospitalier**.  
Complète votre grille de maturité (~**6/10** global, juillet 2026).

**Préparation hôpital** : [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md) · **Issues** : [GITHUB_ISSUES_HOSPITAL.md](GITHUB_ISSUES_HOSPITAL.md)

---

## Synthèse par dimension

### Architecture backend — 7/10 ✅ Point fort

**Ce qui est solide**

- Couches `domain` / `application` / `infrastructure` / `routers` réellement appliquées.
- Services métier testables (`AuthService`, `PatientService`, `ArgosService`, `AiService`).
- Ports LLM, injection via `deps.py`.
- Erreurs métier unifiées (`ApplicationError`).
- Résilience LLM (`llm_resilience.py`, circuit breaker).

**À renforcer**

- Pattern transaction `DbUnitOfWork` : en place pour profil patient, ARGOS et `create_biomarker` ; à généraliser aux autres écritures multi-étapes.
- Frontières `PatientService` / `PatientClinicalService` : [`backend_fastapi/docs/SERVICE_BOUNDARIES.md`](../backend_fastapi/docs/SERVICE_BOUNDARIES.md).

---

### Données & migrations — 7/10 ✅ Point fort

**Ce qui est solide**

- Alembic = source de vérité schéma.
- CI teste réversibilité migrations (`downgrade -1` / `upgrade head`).
- Seeds idempotents avec vrais hashes bcrypt.

**À renforcer**

- Pas de stratégie documentée de **migration de données prod** (gros volumes, rollback).
- Pas de backup / restore runbook dans le repo → **issue H2**.

---

### Sécurité — 6/10 ⚠️

**Ce qui est solide**

- JWT access + refresh HttpOnly.
- Lockout login (throttle).
- RBAC sur routes sensibles.
- Prompt safety + audit IA côté backend.
- Frontend : token access en mémoire, intercepteur refresh 401.
- Guide labo : [LABO_SECURITY.md](LABO_SECURITY.md).

**Lacunes**

| Gap | Impact | Priorité |
|-----|--------|----------|
| `ForgotPassword` = écran placeholder, pas d'API | UX / sécurité perçue | H2 |
| Pas de rotation / révocation refresh tokens côté serveur | Session compromise non invalidable finement | H2 |
| Pas de MFA | Exigence hôpital fréquente | H3 |
| Pas de SSO OIDC/SAML | Bloquant DSI | H3 |
| `ALLOW_DEMO_PASSWORD_FALLBACK` — doit rester `false` partout prod | Risque critique si mal configuré | Continu |
| Données patient en `localStorage` (draft profil) | Fuite sur poste partagé | H1 (badge + avertissement) |

---

### Tests & CI — 6,5/10 ⚠️

**Ce qui est solide**

- ~38 fichiers pytest, tests intégration DB.
- ~20+ fichiers tests frontend Vitest.
- 3 specs Playwright (ARGOS flow + F5, auth session).
- Seuil couverture backend 65 % + modules critiques 80 %.
- CI : typecheck, ESLint, Ruff, build, E2E.

**Lacunes**

| Gap | Impact |
|-----|--------|
| Couverture frontend **non seuillée** en CI | Régressions UI probables |
| E2E ne couvre pas profil autosave ni admin assign | Parcours métier partiels |
| Tests intégration skippés sans DB locale | Développeurs peuvent ignorer les échecs |
| Pas de tests de charge / perf API | Risque avant pilote hospitalier |
| Pas de budget taille bundle frontend | TTI non maîtrisé |

---

### Frontend — ~5,5/10 ⚠️ En progrès

**Progrès récents (2026)**

- `PatientFile.tsx` découpé (~200 lignes) + `usePatientReport`.
- `strictNullChecks`, ESLint sur `client/`.
- Auth refresh session.
- ARGOS : API seule, patients réels, React Query, F5 session, i18n pages critiques.
- `GET /api/ai/status`, erreurs LLM FR.

**Lacunes majeures**

| Gap | Fichier / zone | Priorité |
|-----|----------------|----------|
| ~~ARGOS historique en `localStorage`~~ | `useArgosHistory.ts` | 🟢 Fait |
| ~~Patients fictifs dans ARGOS~~ | `ArgosSpace.tsx` | 🟢 Fait |
| ~~React Query cache unifié~~ | `hooks/queries/` | 🟢 Fait |
| ~~i18n pages critiques~~ | `fr.ts` | 🟢 Fait |
| Badge sync profil patient | `PatientInfosTab.tsx` | 🟢 `ProfileSyncStatusBadge` |
| Indicateur mock vs IA réelle | Report + ARGOS | **H1** |
| `strict: false` (seul `strictNullChecks`) | `tsconfig.json` | P2 |
| Composants shadcn non testés | `components/ui/` | P2 |
| Pages admin / Help EN résiduel | Voir [I18N_INVENTORY.md](I18N_INVENTORY.md) | P2 |
| Code splitting / lazy routes | `App.tsx` | **H2 perf** |

---

### Prod / entreprise — 3/10 🔴

**Absent aujourd'hui**

- Observabilité (metrics, tracing, alerting).
- Logs structurés exportables (ELK, Datadog…).
- Runbooks incident / disaster recovery.
- Documentation conformité RGPD / HDS.
- Pipeline déploiement versionné (staging → prod).
- Feature flags centralisés.
- Tests de charge et SLO documentés.

**Minimum viable labo (fait / partiel)**

- Health : `GET /api/ping` (basique).
- Variables d'env validées : `scripts/validate-lab-env.py`.
- Guide déploiement labo : README + [LABO_SECURITY.md](LABO_SECURITY.md).
- Docker Compose : `pnpm run compose:up`.

**Cible hôpital** : voir [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md).

---

### Performance — 4/10 🔴 (nouveau axe)

**Absent**

- Tests de charge (k6, Locust).
- SLO latence API (P95 hors LLM).
- Rate limiting API.
- Pooling PostgreSQL documenté (PgBouncer).
- Audit bundle Vite / Lighthouse CI.
- CDN ou cache assets prod.

**Partiel**

- Circuit breaker LLM backend.
- React Query (cache client, pas de prefetch parcours optimisé).

---

### Cohérence produit — ~6/10 ⚠️

**Incohérences actives**

| Domaine | Comportement actuel | Comportement cible |
|---------|---------------------|-------------------|
| Historique ARGOS | API (source de vérité) | 🟢 Fait |
| Liste patients ARGOS | `GET /api/patients` | 🟢 Fait |
| Session ARGOS F5 | `sessionStorage` + sync API | 🟢 Fait |
| Profil patient | Draft local prioritaire si présent | Badge brouillon / synchronisé — 🟢 fait (`ProfileSyncStatusBadge`) |
| Discussions ARGOS « générales » | Locales seulement (`local_*`) | Décision produit à trancher |
| Rapport IA | Stream réel OU fallback local silencieux | Indicateur clair « simulé » vs « IA » |

---

## Matrice risque × effort (priorisation PO)

```text
Impact utilisateur élevé, effort modéré (H1) :
  → E2E parcours complet
  → Seuil couverture frontend CI
  → Badge sync profil + indicateur IA

Impact exploitation hôpital (H2) :
  → Observabilité, backup/restore, pipeline déploiement
  → Reset MDP, tests de charge, rate limiting
  → Traçabilité IA consultable

Impact conformité DSI (H3) :
  → SSO, MFA, HDS, FHIR, multi-établissement

Performance « grande app » (H2) :
  → Lazy routes, bundle audit, index SQL, prefetch React Query
```

---

## Validation score global

Score **~6/10** cohérent avec le code (juillet 2026) :

- Le backend est **en avance** sur le frontend et la prod.
- La CI est **au-dessus de la moyenne** pour un projet de cette taille.
- Les gaps **prod**, **performance** et **conformité** plafonnent le score global.
- Cible **~7/10** réaliste après H1 + début H2 (2–3 mois).
- Cible **8+/10** pour production hospitalière (H2–H3, 6–12 mois).

---

## Liens

- Plan d'action : [ROADMAP.md](ROADMAP.md)
- État fonctionnel : [PROJECT_STATE.md](PROJECT_STATE.md)
- Préparation hôpital : [HOSPITAL_READINESS.md](HOSPITAL_READINESS.md)
- Issues à créer : [GITHUB_ISSUES_HOSPITAL.md](GITHUB_ISSUES_HOSPITAL.md)
