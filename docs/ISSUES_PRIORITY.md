# Priorité des issues GitHub — ARCANE

**Dernière mise à jour** : juillet 2026  
**Vue backlog** : [GITHUB_ISSUES_HOSPITAL.md](GITHUB_ISSUES_HOSPITAL.md)

Les issues sont ordonnées par **impact clinique** puis **effort**. Les milestones GitHub reprennent cette numérotation.

---

## Fait / fermé (ne pas rouvrir)

| Issue | Sujet | Raison |
|-------|--------|--------|
| #19 | ARGOS patients API | Livré (`useArgosPatients`) |
| #25 | Runbook LLM labo | `docs/QWEN_INTEGRATION.md` + `.env.example` |
| #26 | Reset MDP (ancien) | Doublon → #41 |
| #27 | Observabilité (ancien) | Doublon → #38 |
| #28 | Traçabilité IA (ancien) | Doublon → #47 |
| #24 | E2E ARGOS reload (partiel) | F5 livré ; reste dans #34 |
| #37 | Indicateur mock vs IA | PR `feat/issue-37-llm-mode-indicator` |

---

## P1 — Urgent (pilote labo)

| Priorité | Issue | Titre |
|----------|-------|-------|
| 1 | [#36](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/36) | Badge brouillon / synchronisé profil |
| 2 | [#34](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/34) | E2E autosave + admin assign (+ F5) |
| 3 | [#35](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/35) | Seuil couverture frontend CI |

---

## H2 — Pré-production (3–6 mois)

| Priorité | Issue | Titre |
|----------|-------|-------|
| 4 | [#38](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/38) | Observabilité logs / health / metrics |
| 5 | [#41](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/41) | Reset MDP + refresh tokens |
| 6 | [#40](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/40) | Runbooks backup / restore |
| 7 | [#39](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/39) | Pipeline staging → prod |
| 8 | [#44](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/44) | Tests de charge + SLO |
| 9 | [#45](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/45) | Perf frontend (lazy routes) |
| 10 | [#46](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/46) | Rate limiting + pooling DB |
| 11 | [#47](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/47) | Journal traçabilité IA |
| 12 | [#49](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/49) | Feedback clinicien + cas référence |

---

## H3 — Hôpital / DSI (6–12 mois)

| Priorité | Issue | Titre |
|----------|-------|-------|
| 13 | [#42](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/42) | SSO + MFA |
| 14 | [#43](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/43) | RGPD / HDS / DPIA |
| 15 | [#48](https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/issues/48) | FHIR + multi-établissement |

---

## Prochaine issue recommandée

**#36** — badge sync profil patient (UX clinique, effort S).
