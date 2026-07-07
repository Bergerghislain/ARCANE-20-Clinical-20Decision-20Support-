# Inventaire i18n — ARCANE

**Politique** : français prioritaire pour l'UI clinicien. Anglais résiduel progressivement retiré ou basculé vers `client/lib/i18n/fr.ts`.

**Dernière mise à jour** : juillet 2026

---

## Méthode d'inventaire

1. Recherche des chaînes visibles utilisateur dans `client/pages/` et `client/components/` (hors `components/ui/` shadcn).
2. Classification : **FR** | **EN** | **mixte**.
3. Pages **critiques** (parcours clinicien quotidien) traduites en priorité.
4. Chaînes centralisées dans [`client/lib/i18n/fr.ts`](../client/lib/i18n/fr.ts) pour réutilisation.

---

## Pages critiques — statut

| Page / zone | Fichier | Statut | Notes |
|-------------|---------|--------|-------|
| Dashboard | `pages/Dashboard.tsx` | 🟢 FR | Liste patients, boutons, filtres |
| Dossier patient | `pages/PatientFile.tsx` | 🟢 FR | Onglets traduits |
| ARGOS accueil | `components/argos/WelcomeScreen.tsx` | 🟢 FR | Écran d'accueil complet |
| ARGOS espace | `pages/ArgosSpace.tsx` | 🟢 FR | Titres, discussion générale |
| Sélecteur patient ARGOS | `components/argos/PatientSelector.tsx` | 🟢 FR | Placeholders et libellés |
| Infos patient | `components/patient-file/PatientInfosTab.tsx` | 🟡 Partiel | Corps du formulaire déjà FR |
| Login / Register | `pages/Login.tsx`, `Register.tsx` | 🟢 FR | Déjà en français |
| Header | `components/layout/Header.tsx` | 🟢 FR | Tagline, liens admin |
| Sidebar | `components/layout/Sidebar.tsx` | 🟢 FR | Navigation + pied de page |
| Settings | `pages/Settings.tsx` | 🟢 FR | Compte et application |

---

## Chaînes EN restantes (hors pages critiques)

| Fichier | Exemple EN | Priorité |
|---------|------------|----------|
| `lib/argosApi.ts` | Messages d'erreur throw (dev) | Basse — logs |
| `pages/AdminUsers.tsx`, `AdminPatientHandler.tsx` | Labels admin | P2 |
| `pages/Help.tsx` | Aide | P2 |
| `pages/AddPatient.tsx` | Quelques labels | P2 |
| `components/argos/ArgosSidebar.tsx` | Sidebar historique | P2 |
| Tests (`*.test.tsx`) | Assertions EN | N/A |

---

## Comment ajouter une traduction

1. Ajouter la clé dans `client/lib/i18n/fr.ts` (section logique : `argos`, `dashboard`, etc.).
2. Remplacer la chaîne en dur : `import { fr } from "@/lib/i18n/fr"` puis `{fr.dashboard.addPatient}`.
3. Mettre à jour ce fichier (statut 🟢).
4. **Ne pas** introduire i18next tant que le volume reste modeste — un fichier `fr.ts` suffit pour ~100 chaînes.

---

## Prochaine étape suggérée (P2)

- Traduire pages admin, Help, AddPatient, ArgosSidebar.
- Optionnel : `react-i18next` si > 200 chaînes ou besoin EN labo.
