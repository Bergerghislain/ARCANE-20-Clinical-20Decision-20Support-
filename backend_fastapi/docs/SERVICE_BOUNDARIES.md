# Frontières de services patient

Guide pour savoir **quel service appeler** lors d'une évolution backend.

## PatientService (`patient_service.py`)

**Responsabilité** : identité patient, liste, assignation, **profil JSON** (`patient_profiles` / `health_info`), lecture du **bundle clinique agrégé** (délégation lecture).

| Opération | Méthode / use case |
|-----------|-------------------|
| Lister / lire un patient | `list_patients`, `get_patient` |
| Créer patient, assigner clinicien | `create_patient`, `assign_patient` |
| Profil rapport (autosave UI) | `get_patient_profile`, `save_patient_profile` |
| Vue clinique complète (lecture) | `get_patient_clinical_bundle` |

**Ne pas y ajouter** de CRUD sectionnel (mesures, médicaments, prélèvements…) — cela appartient à `PatientClinicalService`.

## PatientClinicalService (`patient_clinical_service.py`)

**Responsabilité** : **écritures section par section** sur les tables cliniques structurées (mesures, traitements, cancers, prélèvements, biomarqueurs…).

| Opération | Exemple |
|-----------|---------|
| CRUD mesure | `create_measure`, `update_measure`, `delete_measure` |
| CRUD médicament / chirurgie / radio | `create_medication`, … |
| CRUD cancer / TNM / imagerie | `create_tnm_event`, … |
| CRUD prélèvement / biomarqueur | `create_specimen`, `create_biomarker`, … |

**Toujours** passer par `_ensure_patient_access` (RBAC + audit `patient_clinical_modified`).

**Ne pas y mettre** : logique profil JSON PatientFile, discussions ARGOS, génération IA.

## Transactions (`DbUnitOfWork`)

| Zone | Pattern actuel |
|------|----------------|
| Profil patient (`save_patient_profile`) | `DbUnitOfWork` + `FOR UPDATE` |
| Discussions ARGOS (message + discussion) | `DbUnitOfWork` dans `argos_repository` |
| CRUD clinique sectionnel | Requête unique autocommit via `fetch_one` / `execute` |
| Biomarqueur (vérif prélèvement + INSERT) | `DbUnitOfWork` depuis renforcement P1 |

**Règle** : dès qu'une opération métier fait **2+ écritures/lectures liées**, encapsuler dans `with DbUnitOfWork() as uow:` et `uow.commit()`.

## Router → service

```text
/api/patients/*           → PatientService
/api/patients/{id}/clinical (GET bundle) → PatientService
/api/patients/{id}/clinical/* (POST/PUT/DELETE section) → PatientClinicalService
/api/argos/*              → ArgosService
/api/ai/*                 → AiService
```
