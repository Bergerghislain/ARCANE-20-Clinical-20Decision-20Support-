# Glossaire ARCANE

Termes métier et techniques utilisés dans le projet.

---

## Métier / clinique

| Terme | Signification |
|-------|----------------|
| **ARCANE** | Plateforme d'aide à la décision clinique (cancers rares). |
| **ARGOS** | Assistant IA de raisonnement clinique intégré à la plateforme (discussions, synthèses structurées). |
| **IPP** | Identifiant Permanent Patient (équivalent MRN / identifiant dossier). |
| **MRN** | Medical Record Number — affiché côté UI, souvent aligné sur l'IPP. |
| **Dossier patient** | Ensemble identité + données cliniques structurées + profil éditable + rapports. |
| **Profil patient** | Document JSON (diagnostic, synthèse, analyses, `clinicalData`) versionné en `patient_profiles`. |
| **Rapport IA** | Synthèse générée : conclusion, raisonnement, sources (`SimulatedIaReport` ou LLM). |
| **MDT** | Réunion multidisciplinaire (contexte d'usage typique des synthèses). |
| **TNM** | Classification tumeur / nœuds / métastases (section `primaryCancer`). |
| **Prélèvement** | `biologicalSpecimenList` — échantillons biologiques. |
| **Clinicien** | Utilisateur soignant avec accès patients assignés. |
| **Researcher** | Rôle lecture limitée (pas d'écriture clinique complète). |

---

## Technique — frontend

| Terme | Signification |
|-------|----------------|
| **SPA** | Single Page Application (React). |
| **apiFetch** | Wrapper HTTP unique (`client/lib/api.ts`) avec auth et refresh. |
| **Draft local** | Brouillon profil dans `localStorage` (`arcane_patient_profile_v1:*`). |
| **Bootstrap auth** | Tentative de refresh silencieux au chargement de l'app. |
| **Mock patients** | Liste fictive hardcodée dans `ArgosSpace.tsx` (dettes — à remplacer). |

---

## Technique — backend

| Terme | Signification |
|-------|----------------|
| **Alembic** | Outil de migrations PostgreSQL. |
| **Seeds** | Données de démo (`seed_demo.py`) — users + patients. |
| **ApplicationError** | Exception métier → code HTTP dans les routeurs. |
| **RBAC** | Contrôle d'accès par rôle (`admin`, `clinician`, `researcher`). |
| **Refresh token** | JWT long durée, cookie HttpOnly, renouvelle l'access token. |
| **LLM_PROVIDER** | `disabled` \| `mock_json` \| `openai_compatible`. |
| **SSE** | Server-Sent Events — streaming réponses IA. |
| **activity_logs** | Journal d'audit actions utilisateur (création discussion ARGOS, etc.). |

---

## Sections JSON profil (`clinicalData`)

| Clé JSON | Contenu |
|----------|---------|
| `primaryCancer` | Cancers primitifs / stadification |
| `biologicalSpecimenList` | Prélèvements |
| `mesureList` | Mesures (taille, poids, biologie…) |
| `medication` | Traitements médicamenteux |
| `surgery` | Chirurgies |

---

## Acronymes projet

| Acronyme | Signification |
|----------|----------------|
| **CI** | Continuous Integration (GitHub Actions) |
| **E2E** | Tests bout en bout (Playwright) |
| **HDS** | Hébergeur de Données de Santé (France) |
| **RGPD** | Règlement protection données UE |
| **DPIA** | Analyse d'impact relative à la protection des données |
