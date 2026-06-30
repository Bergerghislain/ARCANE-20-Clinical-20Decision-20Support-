# Template sprint ARCANE (2 semaines)

Copier ce fichier en `docs/sprints/SPRINT-YYYY-MM-DD.md` au début de chaque sprint.

---

## En-tête

| Champ | Valeur |
|-------|--------|
| **Sprint** | Sprint N — du JJ/MM/AAAA au JJ/MM/AAAA |
| **Objectif sprint** | Une phrase : quel jalon on vise |
| **Capacité estimée** | X jours-dev (ou points si vous en utilisez) |
| **Démo prévue** | Date + audience (équipe, clinicien pilote…) |

---

## Objectif produit (pourquoi ce sprint ?)

> Exemple : « Un clinicien peut utiliser ARGOS sur un vrai patient et retrouver son historique après rechargement de la page. »

---

## Périmètre IN (engagé)

| ID | Issue GitHub | Titre | Owner | Estimation |
|----|--------------|-------|-------|------------|
| | # | | | j |

### Critères d'acceptation sprint (Definition of Done)

- [ ] Toutes les issues IN mergées sur `main`
- [ ] CI verte (frontend + backend + e2e si touché)
- [ ] [PROJECT_STATE.md](PROJECT_STATE.md) mis à jour si comportement utilisateur change
- [ ] Démo du parcours cible réussie en local (ou labo)
- [ ] Pas de régression connue sur login / dashboard / dossier patient

---

## Périmètre OUT (explicitement reporté)

| Item | Raison du report |
|------|------------------|
| | |

---

## Risques & dépendances

| Risque | Impact | Mitigation |
|--------|--------|------------|
| DB locale non migrée | Tests intégration skippés | `ci-init-db.ps1` en début de sprint |
| | | |

---

## Plan jour par jour (optionnel)

| Jour | Focus |
|------|-------|
| L1 | Setup, revue issues, spike si besoin |
| M1–J2 | Développement P0 |
| V1 | Tests + PR |
| L2 | Merge, début P1 ou dette |
| … | … |
| V2 | Démo + rétro |

---

## Démo script (5–10 min)

1. Login `martin@hospital.com`
2. …
3. …

**Résultat attendu visible** : …

---

## Rétrospective (remplir en fin de sprint)

### Ce qui a bien marché

-

### Ce qui a bloqué

-

### Actions sprint suivant

- [ ]

---

## Métriques (optionnel)

| Métrique | Début sprint | Fin sprint |
|----------|--------------|------------|
| Issues fermées | | |
| Couverture backend | | |
| Bugs ouverts P0 | | |

---

## Liens

- Roadmap : [ROADMAP.md](ROADMAP.md)
- Issues : [GITHUB_ISSUES.md](GITHUB_ISSUES.md)
- Board GitHub : `https://github.com/<org>/<repo>/issues`
