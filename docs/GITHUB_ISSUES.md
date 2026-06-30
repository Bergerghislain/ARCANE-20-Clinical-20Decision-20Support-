# Issues GitHub — guide et backlog ARCANE

## C'est quoi une « issue » GitHub ?

Une **issue** est une **fiche de travail** sur GitHub, rattachée à votre dépôt. C'est l'équivalent d'un ticket Jira/Trello, mais intégré au code.

Chaque issue contient typiquement :

- un **titre** court ;
- une **description** (contexte, critères d'acceptation, liens) ;
- des **labels** (`bug`, `enhancement`, `P0`…) ;
- un **assigné** (qui s'en occupe) ;
- un **statut** implicite : ouverte → fermée quand c'est livré (souvent via une PR qui mentionne `Fixes #12`).

### À quoi ça sert concrètement pour ARCANE ?

| Usage | Bénéfice |
|-------|----------|
| **Backlog produit** | La roadmap n'est plus seulement dans un `.md` : chaque item est traçable |
| **Priorisation** | Vous voyez P0 / P1 / bugs en un coup d'œil |
| **Revue & historique** | « Pourquoi on a fait ça ? » → lire l'issue + la PR liée |
| **Onboarding** | Un nouveau dev prend une issue, lit les critères, ouvre une branche |
| **Sprint** | En fin de sprint : compter les issues fermées vs prévues |
| **CI / qualité** | Certaines équipes lient « PR merge = issue fermée » |

### Workflow recommandé (léger)

```text
1. Créer une issue (ou choisir une existante)
2. Branche git : fix/12-argos-api-source
3. Commits + PR vers main
4. Dans la PR : « Fixes #12 »
5. Merge → issue fermée automatiquement
```

---

## Créer les issues depuis ce dépôt

Prérequis : [GitHub CLI](https://cli.github.com/) (`gh`) installé et connecté :

```bash
gh auth login
```

Puis, à la racine du projet :

```bash
# Linux / macOS / Git Bash
bash scripts/create-github-issues.sh

# Ou créer une issue manuellement
gh issue create --title "Mon titre" --body "Description" --label "enhancement"
```

Le script `scripts/create-github-issues.sh` recrée le backlog prioritaire décrit dans [ROADMAP.md](ROADMAP.md). Il est **idempotent partiellement** : relancer peut créer des doublons ; à utiliser une fois ou après suppression des issues dupliquées.

---

## Liste des issues prévues (backlog)

| # suggéré | Titre | Horizon | Label |
|-----------|-------|---------|-------|
| P0.1 | ARGOS : API seule source de vérité historique | H0 | `P0`, `bug` |
| P0.5 | Merger branches ouvertes / aligner main | H0 | `chore` |
| P1.1 | ARGOS : brancher liste patients sur `/api/patients` | H1 | `P1`, `enhancement` |
| P1.2 | Profil patient : clarifier draft local vs sync API | H1 | `P1`, `ux` |
| P1.3 | Politique i18n (FR prioritaire) | H1 | `P1` |
| P1.4 | React Query pour état serveur | H1 | `P1`, `frontend` |
| P1.5 | Seuil couverture tests frontend en CI | H1 | `P1`, `testing` |
| P1.6 | E2E : ARGOS reload + profil autosave | H1 | `P1`, `testing` |
| P1.7 | Runbook LLM labo (Qwen / openai_compatible) | H1 | `P1`, `documentation` |
| H2.1 | Reset mot de passe (API + UI) | H2 | `enhancement` |
| H2.2 | Observabilité (health, logs structurés) | H2 | `infrastructure` |
| H2.3 | Traçabilité IA consultable | H2 | `enhancement` |

Voir [ROADMAP.md](ROADMAP.md) pour le détail.

---

## Labels à créer sur le dépôt (une fois)

```bash
gh label create "P0" --color "d73a4a" --description "Critique - sprint actuel"
gh label create "P1" --color "fbca04" --description "Important - horizon 1-2 mois"
gh label create "H2" --color "0e8a16" --description "Pré-production"
gh label create "frontend" --color "1d76db"
gh label create "backend" --color "5319e7"
gh label create "testing" --color "bfdadc"
gh label create "documentation" --color "0075ca"
gh label create "ux" --color "e99695"
```

---

## Lier une PR à une issue

Dans la description de la PR :

```markdown
Fixes #42
```

ou pour référence sans fermeture : `Related to #42`.
