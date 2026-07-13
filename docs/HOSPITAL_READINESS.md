# Préparation déploiement hospitalier ARCANE

Document de référence pour passer du **labo clinique** (~6/10) à un **pilote hospitalier** puis une **mise en production** alignée sur les exigences DSI et les standards de performance des applications à grande échelle.

**Dernière mise à jour** : juillet 2026  
**Liens** : [ROADMAP.md](ROADMAP.md) · [KNOWN_GAPS.md](KNOWN_GAPS.md) · [PROJECT_STATE.md](PROJECT_STATE.md)

---

## Où en est le projet aujourd'hui

| Capacité | Statut | Commentaire |
|----------|--------|-------------|
| Dossier patient + profil JSON | 🟢 Fiable | Draft local + API ; badge sync à finaliser |
| ARGOS discussions API | 🟢 Fiable | PostgreSQL source de vérité |
| ARGOS patients réels | 🟢 Fait | `useArgosPatients` + `GET /api/patients` |
| ARGOS persistance F5 | 🟢 Fait | `sessionStorage` + restauration post-sync API |
| Auth JWT + refresh cookie | 🟢 Fiable | Pas de MFA / SSO |
| React Query (cache client) | 🟢 Fait | Patients, profil, bundle, ARGOS |
| i18n pages critiques | 🟢 Fait | `fr.ts` ; admin/Help en P2 |
| CI (lint, tests, E2E) | 🟡 Solide | 3 specs Playwright ; pas de seuil couverture frontend |
| LLM labo | 🟡 Documenté | `mock_json` / Ollama / Groq ; runbook à valider en pilote |
| Observabilité prod | 🔴 Absent | Pas de metrics/tracing/alerting |
| Conformité HDS/RGPD | 🔴 Absent | Pas de DPIA ni registre dans le repo |
| Intégration SI hospitalier | 🔴 Absent | Pas de FHIR/SSO |
| Performance à l'échelle | 🔴 Non mesurée | Pas de tests de charge ni SLO |

**Score global estimé** : **~6/10** (post-horizon H1 partiel) — cible pilote **7/10**, production hôpital **8+/10**.

---

## Les 5 piliers avant un hôpital

### 1. Fiabilité clinique (H1 — en cours)

Objectif : aucune perte de données perceptible par le clinicien.

- Finaliser UX sync profil (badge brouillon / synchronisé).
- Élargir E2E : autosave profil, admin assign, ARGOS reload.
- Seuil couverture frontend en CI (`lib/`, pages critiques).
- Décision produit : discussions ARGOS « générales » (API vs local).
- Indicateur explicite « réponse simulée » vs « IA réelle ».

### 2. Sécurité & identité (H2)

Objectif : niveau attendu par la DSI hospitalière.

- Réinitialisation mot de passe (API + e-mail ou procédure IT).
- Rotation et révocation des refresh tokens côté serveur.
- MFA (TOTP ou SSO).
- SSO OIDC/SAML (souvent prérequis avant pilote multi-services).
- Audit connexions et sessions actives.
- Revue RBAC + durcissement cookies prod (`Secure`, `SameSite`).

### 3. Observabilité & exploitation (H2)

Objectif : diagnostiquer un incident en < 15 min sans accès développeur.

- Logs structurés JSON (correlation ID par requête).
- Endpoints `/health` (liveness) et `/ready` (DB + LLM optionnel).
- Métriques : latence API P50/P95, taux 5xx, durée appels LLM.
- Alerting basique (disque, DB, erreurs 5xx).
- Runbooks : backup PostgreSQL, restore, rollback déploiement, incident LLM.

### 4. Performance & résilience (H2)

Objectif : expérience fluide type « grande app » (TTI < 3 s, API P95 < 500 ms hors LLM).

- Tests de charge k6/Locust sur routes critiques (`/api/patients`, ARGOS).
- Index SQL + revue requêtes N+1 (listes discussions + messages).
- Pooling PostgreSQL (PgBouncer) en prod.
- Rate limiting API (auth, IA, création discussions).
- Frontend : code splitting, lazy routes, audit bundle Vite.
- React Query : `staleTime` / prefetch parcours dashboard → patient → ARGOS.
- Circuit breaker LLM (déjà amorcé) + timeouts documentés.
- Cache HTTP assets statiques (nginx/CDN interne).

### 5. Conformité & intégration SI (H3)

Objectif : dossier prêt pour commission données / achat DSI.

- Documentation RGPD : registre traitements, base légale, rétention.
- DPIA simplifiée (IA clinique, logs, hébergement).
- Hébergement certifié HDS (France) ou équivalent.
- Multi-établissement (tenant / site_id sur patients et logs).
- Intégration FHIR R4 (Patient, Observation, DiagnosticReport) — lecture puis écriture.
- Traçabilité IA consultable : version prompt, hash entrée, modèle, utilisateur, horodatage.

---

## Jalons recommandés

```text
M2 (fin H1)   : E2E parcours complet, couverture frontend CI, LLM labo validé
M3 (fin H2)   : Observabilité + perf mesurée + reset MDP + pilote 5–10 cliniciens
M4 (fin H3)   : SSO + dossier conformité + intégration DPI lecture
M5 (prod)     : HDS, multi-site, SLA, support N2
```

---

## Issues GitHub associées

Les issues sont créées à partir de [GITHUB_ISSUES_HOSPITAL.md](GITHUB_ISSUES_HOSPITAL.md).  
Après `gh auth login` :

```powershell
powershell -File scripts/create-hospital-issues.ps1
```

---

## Checklist rapide avant pilote (extrait)

- [ ] `ALLOW_DEMO_PASSWORD_FALLBACK=false` partout
- [ ] `JWT_SECRET` fort, rotation documentée
- [ ] `python scripts/validate-lab-env.py --strict-https` OK
- [ ] Backup PostgreSQL automatisé + test restore < 30 j
- [ ] E2E verts sur `main`
- [ ] LLM en `openai_compatible` avec endpoint joignable depuis le serveur
- [ ] Procédure mot de passe oublié (même manuelle) documentée
- [ ] Contact astreinte + runbook incident
