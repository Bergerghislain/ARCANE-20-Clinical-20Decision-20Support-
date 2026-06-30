# Documentation ARCANE

Index de la documentation du projet. **Commencez ici** si vous rejoignez l'équipe.

## Parcours recommandé

| Profil | Ordre de lecture |
|--------|------------------|
| **Nouveau développeur** | [ONBOARDING.md](ONBOARDING.md) → [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) → [GLOSSARY.md](GLOSSARY.md) |
| **Product / pilotage** | [ROADMAP.md](ROADMAP.md) → [SPRINT_CURRENT.md](SPRINT_CURRENT.md) → [GITHUB_ISSUES.md](GITHUB_ISSUES.md) → [KNOWN_GAPS.md](KNOWN_GAPS.md) |
| **Backend** | [BACKEND_GUIDE.md](BACKEND_GUIDE.md) → `backend_fastapi/README.md` → `backend_fastapi/ARCHITECTURE_SOLID_DDD.md` |
| **Frontend** | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) |
| **DevOps / labo** | [LABO_SECURITY.md](LABO_SECURITY.md) → [GITHUB_BRANCH_PROTECTION.md](GITHUB_BRANCH_PROTECTION.md) |
| **IA / LLM** | [QWEN_INTEGRATION.md](QWEN_INTEGRATION.md) |

## Fichiers de référence

| Document | Contenu |
|----------|---------|
| [ONBOARDING.md](ONBOARDING.md) | Prise en main jour 1 / semaine 1 |
| [ROADMAP.md](ROADMAP.md) | Prochaines étapes produit & technique (priorisées) |
| [SPRINT_CURRENT.md](SPRINT_CURRENT.md) | Sprint en cours (2 semaines) avec critères d'acceptation |
| [SPRINT_TEMPLATE.md](SPRINT_TEMPLATE.md) | Modèle réutilisable pour chaque sprint |
| [GITHUB_ISSUES.md](GITHUB_ISSUES.md) | Guide issues GitHub + script de création du backlog |
| [KNOWN_GAPS.md](KNOWN_GAPS.md) | Lacunes honnêtes vs objectif clinique / entreprise |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Snapshot fonctionnel « ce qui marche aujourd'hui » |
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | Vue d'ensemble des couches et flux |
| [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) | Conventions React, état, API client |
| [BACKEND_GUIDE.md](BACKEND_GUIDE.md) | Conventions FastAPI, services, tests |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, PR, CI, qualité |
| [DECISIONS.md](DECISIONS.md) | Décisions structurantes (ADR légers) |
| [GLOSSARY.md](GLOSSARY.md) | Vocabulaire métier et technique |

## Documents existants (hors ce dossier)

- Racine : [`README.md`](../README.md) — installation, commandes, structure
- Backend détaillé : [`backend_fastapi/README.md`](../backend_fastapi/README.md)
- Sécurité labo : [LABO_SECURITY.md](LABO_SECURITY.md)
- Protection GitHub : [GITHUB_BRANCH_PROTECTION.md](GITHUB_BRANCH_PROTECTION.md)
- Intégration Qwen : [QWEN_INTEGRATION.md](QWEN_INTEGRATION.md)

## Mise à jour de la doc

Quand vous livrez une fonctionnalité visible ou un changement d'architecture :

1. Mettre à jour [PROJECT_STATE.md](PROJECT_STATE.md) si le comportement utilisateur change.
2. Ajouter une entrée dans [DECISIONS.md](DECISIONS.md) si le choix technique est durable.
3. Ajuster [ROADMAP.md](ROADMAP.md) (cocher / décaler les items).
4. Si un gap est comblé, retirer ou nuancer l'entrée dans [KNOWN_GAPS.md](KNOWN_GAPS.md).
