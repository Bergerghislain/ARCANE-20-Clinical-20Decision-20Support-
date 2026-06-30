# Décisions d'architecture (ADR légers)

Journal des décisions importantes. Format : **contexte → décision → conséquences**.

---

## ADR-001 — Backend unique FastAPI

**Date** : 2025 (phase refactor)  
**Contexte** : Ancien code Express / dual stack.  
**Décision** : Un seul backend `backend_fastapi/`, plus de serveur Node pour l'API.  
**Conséquences** : Vite sert le SPA ; proxy dev `/api` → FastAPI.

---

## ADR-002 — Schéma DB via Alembic

**Contexte** : Scripts SQL monolithiques difficiles à versionner.  
**Décision** : Alembic = source de vérité ; seeds séparés (`seed_demo.py`).  
**Conséquences** : CI teste réversibilité ; pas de `setup_database.sql` comme référence.

---

## ADR-003 — Architecture en couches (DDD light)

**Contexte** : Logique métier dispersée dans les routeurs.  
**Décision** : `domain` / `application` / `infrastructure` / `routers`.  
**Conséquences** : Plus de fichiers ; tests unitaires sur services ; courbe d'apprentissage.

---

## ADR-004 — JWT access court + refresh cookie HttpOnly

**Contexte** : Sécurité XSS vs confort session.  
**Décision** : Access token côté client en **mémoire** ; refresh en cookie HttpOnly ; endpoint `/api/auth/refresh`.  
**Conséquences** : `credentials: include` obligatoire ; bootstrap au F5 ; pas de refresh token en JS.

---

## ADR-005 — LLM uniquement côté backend

**Contexte** : Clés API et conformité.  
**Décision** : `LLM_PROVIDER` et clés dans le backend ; streaming SSE via `/api/ai/*`.  
**Conséquences** : Latence réseau supplémentaire ; prompts centralisés et auditables.

---

## ADR-006 — Profil patient : API + draft local

**Contexte** : Saisie longue, risque perte si réseau coupé.  
**Décision** : `patient_profiles` en base ; draft `localStorage` pour brouillon ; autosave API en arrière-plan.  
**Conséquences** : Priorité draft au chargement si présent — **à clarifier en UX** (roadmap P1).

---

## ADR-007 — ARGOS persisté en base (décision cible)

**Date** : mars 2026  
**Contexte** : Double persistance `localStorage` + API → historique perdu ou divergent au F5.  
**Décision** : **API seule source de vérité** pour discussions/messages ; UI = cache session.  
**Statut** : 🟡 **Implémenté** (mars 2026) — `useArgosHistory` ne persiste plus les conversations ; purge legacy `argos_conversations`. À valider par merge PR + CI.  
**Conséquences** : Mappers `argosMappers.ts` ; chargement `GET /api/argos/discussions` ; tests `test_argos_router_integration.py`.

---

## ADR-008 — PatientFile découpé (phase 1)

**Date** : mars 2026  
**Contexte** : God-component ~1500 lignes.  
**Décision** : `usePatientReport` + `components/patient-file/*` ; page orchestrateur < 400 lignes.  
**Statut** : 🟢 Implémenté (~200 lignes).  
**Conséquences** : Phase 2 possible sur `usePatientReport`.

---

## ADR-009 — Qualité : strictNullChecks + ESLint + Ruff

**Date** : mars 2026  
**Décision** : `strictNullChecks: true` ; ESLint sur `client/` ; Ruff sur `backend_fastapi/` en CI.  
**Statut** : 🟢 En place.  
**Conséquences** : `strict: true` complet reste un chantier ultérieur.

---

## Proposer une nouvelle ADR

Ajouter une section en tête de liste (numéro suivant) avec statut 🟡 Proposé jusqu'à validation en revue.
