# Roadmap produit & technique ARCANE

Document de pilotage (vision PO / tech lead).  
**Dernière révision** : mars 2026 — à recalibrer chaque fin de sprint.

## Vision

Offrir aux équipes soignantes un **espace unique** pour consulter le dossier patient, obtenir une **synthèse IA traçable** et mener des **discussions ARGOS** persistantes — avec un niveau de fiabilité compatible avec un **déploiement en laboratoire clinique**, puis en environnement hospitalier.

## Maturité actuelle (estimation)

| Dimension | Score | Cible 6 mois |
|-----------|-------|--------------|
| Architecture backend | 7/10 | 8/10 |
| Données & migrations | 7/10 | 8/10 |
| Sécurité | 6/10 | 7,5/10 |
| Tests & CI | 6,5/10 | 8/10 |
| Frontend | 4/10 → **5/10**¹ | 7/10 |
| Prod / entreprise | 3/10 | 5/10 |
| Cohérence produit | 5/10 | 7,5/10 |
| **Global** | **~5,5/10** | **~7/10** |

¹ Après auth refresh, découpage PatientFile, ESLint/Ruff, P0.1 ARGOS (code prêt) — mock patients ARGOS reste une dette P1.

---

## Principes de priorisation

1. **Fiabilité des données utilisateur** avant nouvelles features.
2. **Une source de vérité** par domaine (pas de double persistance client/serveur).
3. **Tests sur les parcours cliniques** avant élargissement UI.
4. **Backend prêt pour la prod** avant polish visuel.

---

## Horizon 0 — Stabilisation (en cours, ~2 semaines)

Objectif : supprimer les bugs « visibles clinicien » et la dette de cohérence.

| ID | Thème | Statut | Critère de done |
|----|-------|--------|-----------------|
| **P0.1** | ARGOS : API seule source de vérité historique | 🟡 Code prêt — PR à merger | F5 = même historique ; plus de `localStorage` conversations |
| **P0.2** | Auth : refresh automatique session | 🟢 Fait | Pas de déconnexion surprise 15–30 min |
| **P0.3** | PatientFile : découpage phase 1 | 🟢 Fait | `PatientFile.tsx` < 400 lignes, tests verts |
| **P0.4** | Outillage : ESLint, Ruff, `strictNullChecks` | 🟢 Fait | CI verte avec linters |
| **P0.5** | Merger / intégrer branches ouvertes | 🟡 En cours | `main` reflète l'état documenté |

**Livrable sprint** : démo clinique « login → patient → ARGOS → F5 → historique intact » sans mock critique.

---

## Horizon 1 — Produit labo fiable (1–2 mois)

Objectif : un clinicien peut utiliser ARCANE **quotidiennement** sur des vrais patients seeds (puis pilote).

### P1 — Cohérence produit

| Item | Description | Effort |
|------|-------------|--------|
| **ARGOS ↔ patients réels** | Remplacer `mockPatients` dans `ArgosSpace.tsx` par `GET /api/patients` (comme Dashboard) | M |
| **Discussions générales ARGOS** | Décider : persister côté API (patient générique) ou retirer l'UX « general discussion » | S |
| **Profil patient : draft vs API** | UI claire « brouillon local » vs « synchronisé serveur » ; éviter écrasement silencieux | M |
| **i18n** | Politique : **FR prioritaire** ; anglais résiduel progressivement retiré ou basculé via clés i18n | L |

### P1 — Frontend discipline

| Item | Description | Effort |
|------|-------------|--------|
| **React Query (ou équivalent)** | Cache serveur patients, profil, clinical bundle, discussions ARGOS | L |
| **Couverture tests frontend** | Seuil CI sur `lib/` + pages critiques (Dashboard, PatientFile, ArgosSpace, auth) | M |
| **E2E élargis** | Parcours : profil autosave, discussion ARGOS reload, admin assign | M |
| **PatientFile phase 2** | Découper `usePatientReport` (streaming, autosave) | M |

### P1 — IA utilisable en labo

| Item | Description | Effort |
|------|-------------|--------|
| **LLM labo documenté** | Runbook Qwen/vLLM + `LLM_PROVIDER=openai_compatible` validé | M |
| **Bascule mock → réel** | Feature flag env : mock interdit en démo clinique | S |
| **Feedback clinicien** | Thumbs up/down ARGOS → persistance `activity_logs` ou table dédiée | M |

---

## Horizon 2 — Pré-production clinique (3–6 mois)

Objectif : préparer un pilote restreint (service / MDT cancers rares).

| Domaine | Initiatives |
|---------|-------------|
| **Sécurité** | Reset mot de passe réel ; rotation JWT ; revue RBAC ; durcissement cookies prod |
| **Données cliniques** | Écriture complète depuis l'UI (pas seulement JSON expert) pour mesures / traitements |
| **Traçabilité IA** | Journal consultable : prompts versionnés, hash entrées, réponses, utilisateur |
| **Observabilité** | Logs structurés JSON ; `/health` + `/ready` ; métriques latence API / LLM |
| **Qualité IA** | Jeu de cas cliniques de référence ; scoring réponses ARGOS / rapport |
| **Conformité** | Registre traitements données ; politique rétention ; DPIA simplifiée |

---

## Horizon 3 — Entreprise / hôpital (6–12 mois)

| Initiative | Notes |
|------------|-------|
| SSO (OIDC / SAML) | Souvent prérequis IT hospitalier |
| Hébergement certifié (HDS si France) | Impact architecture et logs |
| Multi-établissement | Séparation données par site |
| Intégration DPI / HL7 FHIR | Lecture identité patient, résultats labo |
| Cycle de vie compte complet | MFA, expiration, audit connexions |

---

## Backlog « ne pas faire maintenant »

- Refonte design complète (tant que la cohérence données n'est pas réglée).
- Microservices (monolithe modulaire actuel suffit).
- Application mobile native.
- Fine-tuning modèle propriétaire (d'abord stabiliser prompts + évaluation).

---

## Jalons suggérés

```text
M1 (fin H0)  : ARGOS + auth stables, doc à jour
M2 (fin H1)  : ARGOS sur vrais patients, E2E parcours complet, LLM labo
M3 (fin H2)  : Pilote 5–10 cliniciens, observabilité, traçabilité IA
M4 (fin H3)  : Dossier conformité + SSO prêt pour DSI
```

---

## Comment utiliser ce document

- En **planning** : tirer 2–3 items P0/P1 par sprint max → voir [SPRINT_CURRENT.md](SPRINT_CURRENT.md).
- En **revue** : cocher les statuts 🟢/🔴 et déplacer les items non livrés.
- En **onboarding** : montrer la vision M1–M2 pour contextualiser les tâches « ingrates » (tests, lint, cohérence).
- En **backlog GitHub** : `scripts/create-github-issues.sh` — voir [GITHUB_ISSUES.md](GITHUB_ISSUES.md).

Voir aussi : [KNOWN_GAPS.md](KNOWN_GAPS.md) pour le détail des écarts.
