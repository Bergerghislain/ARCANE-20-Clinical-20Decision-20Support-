# Guide frontend ARCANE

Conventions et patterns pour travailler dans `client/`.

---

## Stack

- React 18 + TypeScript
- Vite 7 (dev port 8080, proxy `/api` → 8000)
- React Router 6
- Tailwind + shadcn/ui
- Vitest + Testing Library

---

## Appels API

**Toujours** passer par `apiFetch` (`client/lib/api.ts`) :

- Ajoute `Authorization: Bearer` si token en mémoire.
- Envoie les cookies (`credentials: include`) pour le refresh.
- Sur 401 : refresh automatique puis retry (sauf routes auth).

```typescript
import { apiFetch } from "@/lib/api";

const res = await apiFetch("/api/patients?limit=24&offset=0");
```

Ne pas utiliser `fetch` brut sauf dans `auth.ts` pour le refresh (éviter boucles).

---

## Authentification

| Donnée | Stockage |
|--------|----------|
| Access token | Mémoire (`client/lib/auth.ts`) |
| Refresh token | Cookie HttpOnly (serveur) |
| User (id, role, email…) | `localStorage` `arcane_auth_user` |

Au chargement : `AuthBootstrap` dans `App.tsx` tente un refresh silencieux.

Routes protégées : `RequireAuth` / `RequireAdmin` dans `App.tsx`.

---

## Organisation des pages

| Page | Responsabilité |
|------|----------------|
| `Dashboard.tsx` | Liste patients, import JSON |
| `PatientFile.tsx` | Orchestrateur onglets (léger) |
| `ArgosSpace.tsx` | Chat ARGOS (encore lourd — chantier) |
| `AdminPatientHandler.tsx` | Réaffectation patients |

**Pattern cible** (PatientFile) :

```text
Page → hooks (logique) → components/ (UI)
```

---

## État local vs serveur

| Type | Où | Exemple |
|------|-----|---------|
| État serveur | API + hook | Liste patients, discussions ARGOS |
| Brouillon UI | `localStorage` | Draft profil patient (`patientProfileStorage.ts`) |
| Cache session UI | `useState` / hooks | Conversations ARGOS en mémoire |

**Anti-pattern** : persister en `localStorage` ce qui existe déjà en base (historique ARGOS).

---

## Tests

```bash
pnpm run test                    # tout Vitest
npx vitest run client/pages/PatientFile.test.tsx
```

- Mocker `@/lib/api` pour les pages.
- Mocker les hooks lourds si vous testez uniquement le layout.
- Préférer `findBy*` pour le contenu async.

Couverture frontend **non** seuillée en CI — ajouter des tests sur tout changement métier.

---

## TypeScript

- `strictNullChecks: true` — gérer `null` / `undefined` explicitement.
- `strict: false` encore — éviter `any` volontairement.
- Alias `@/` → `client/`

---

## Lint

```bash
pnpm run lint
pnpm run lint:fix
```

ESLint 9 flat config : `eslint.config.js`, scope `client/**/*.{ts,tsx}`.

---

## i18n (état actuel)

Mélange français / anglais dans l'UI. **Convention cible** : français pour tout texte clinicien ; anglais technique acceptable dans le code et logs.

Roadmap : extraire les chaînes ou adopter `react-i18next` si besoin multilingue.

---

## Fichiers clés

| Besoin | Fichier |
|--------|---------|
| Routes | `App.tsx` |
| HTTP | `lib/api.ts`, `lib/apiUrl.ts` |
| Auth | `lib/auth.ts` |
| Profil patient | `hooks/usePatientReport.ts`, `lib/patientProfileApi.ts` |
| Clinique structurée | `hooks/usePatientClinicalBundle.ts` |
| ARGOS API | `lib/argosApi.ts`, `lib/argosAiStream.ts` |
| ARGOS UI state | `hooks/useArgosHistory.ts` ⚠️ localStorage à retirer |

---

## Checklist avant PR frontend

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run test` (fichiers touchés)
- [ ] Pas de `fetch` hors `apiFetch` / auth
- [ ] Pas de nouvelle persistance `localStorage` pour données serveur
