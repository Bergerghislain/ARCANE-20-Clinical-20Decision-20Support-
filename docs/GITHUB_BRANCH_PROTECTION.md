# CI obligatoire sur `main` (P3)

GitHub a deux interfaces selon le compte / le depot. Si l’ancienne page **Branches** est vide ou différente, utilise **Rulesets** (méthode actuelle recommandée).

Tu dois être **admin** du dépôt : `Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-`

---

## Méthode A — Rulesets (recommandée, 2024+)

1. Ouvre :  
   **https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/settings/rules**

   Menu : **Settings** (du repo) → barre latérale **Rules** → **Rulesets**  
   (parfois libellé **Règles** → **Ensembles de règles**).

2. **New ruleset** → **New branch ruleset**.

3. **Ruleset name** : `Protect main + CI`

4. **Enforcement status** : **Active**

5. **Target branches** → **Add target** → **Include default branch**  
   ou pattern : `main`

6. Section **Branch rules** — activer :

   - **Require a pull request before merging** (optionnel si tu pushes seul sur `main`, mais utile en équipe)
   - **Require status checks to pass**
     - Cocher **Require branches to be up to date before merging** si proposé
     - Cliquer **Add checks** / **Select checks** et choisir (noms exacts du workflow CI) :
       - `Frontend (TypeScript, Vitest, build)`
       - `Backend (pytest + PostgreSQL)`
     - Si la liste est vide : attendre un run CI **vert** sur `main`, revenir ici et **rafraîchir** la page.

7. **Create** / **Save changes**.

### Vérifier que ça marche

- Onglet **Actions** : dernier run **CI** vert sur `main`.
- Crée une PR de test avec une erreur TypeScript volontaire → merge doit être **bloqué** tant que la CI est rouge.

---

## Méthode B — Protection classique (si disponible)

1. **https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/settings/branches**

2. Si tu vois un lien **Add classic branch protection rule** ou **Switch to classic protection** :

   - Pattern : `main`
   - **Require status checks to pass before merging**
   - Sélectionner les deux jobs CI ci-dessus
   - **Save**

3. Si la page ne montre que des rulesets → utiliser la **méthode A**.

---

## Je ne vois pas « Require status checks »

| Cause | Solution |
|-------|----------|
| Pas admin du repo | Demander le rôle **Admin** au propriétaire |
| Aucun run CI terminé | Pousser sur `main`, attendre workflow **CI** vert |
| Mauvais menu | **Settings** du **repo**, pas des paramètres compte utilisateur |
| Compte gratuit / repo privé ancien | Rulesets reste disponible ; sinon CI verte + discipline manuelle |

---

## Vérifications sur GitHub (sans ruleset)

| Où | Quoi vérifier |
|----|----------------|
| **README** (page d’accueil du repo) | Badge **CI** vert |
| **Actions** → workflow **CI** | Dernier run : les 2 jobs verts |
| **Commits** sur `main` | Coche verte à côté du commit |
| **Pull requests** | Section **Checks** : `Frontend…` et `Backend…` passed |

Liens directs :

- Actions CI : https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/actions/workflows/ci.yml
- Rulesets : https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-/settings/rules

---

## Datadog

Le workflow **Run Datadog Synthetic tests** est **optionnel** (skipped sans secrets `DD_API_KEY` / `DD_APP_KEY`). Seul le workflow **CI** doit être requis pour la protection de branche.
