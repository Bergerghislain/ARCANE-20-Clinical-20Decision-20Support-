# Fiche de lecture - Module Patients / Reaffectation

## 1) Objectif fonctionnel

Garantir ces regles metier:

- un patient a un seul clinicien responsable (`assigned_clinician_id`)
- un clinicien standard ne voit/modifie que ses patients
- un admin voit tous les patients
- un admin peut reaffecter un patient a un autre clinicien, y compris un clinicien nouvellement cree (pas forcement actif)

Cette fiche couvre le flux `POST /api/patients/{patient_id}/assign` et son impact sur le module Patients.

---

## 2) Cartographie des fichiers

- Contrat applicatif: `backend_fastapi/app/application/ports/patient_ports.py`
- Logique metier: `backend_fastapi/app/application/services/patient_service.py`
- Acces base SQL: `backend_fastapi/app/infrastructure/repositories/patient_repository.py`
- Endpoint HTTP: `backend_fastapi/app/routers/patients.py`
- DTO/validation: `backend_fastapi/app/schemas.py`
- Schema DB: `setup_database.sql`
- Tests de reference: `backend_fastapi/tests/test_patients.py`

---

## 3) Architecture par couches (responsabilites)

### Router (interface HTTP)

Role: transformer la requete HTTP en appel de service metier.

- applique auth/rbac via dependances (`AdminUser` pour l'assignation)
- valide le payload via DTO (`PatientAssignIn`)
- transforme les erreurs metier (`ApplicationError`) en codes HTTP coherents

### Service (coeur metier)

Role: porter les regles business.

- verifie le role admin pour autoriser la reaffectation
- verifie existence patient
- verifie que la cible est un compte de role `clinician`
- applique la reaffectation via repository

Important: la regle a ete ajustee de "clinicien actif" vers "compte clinicien" pour coller au besoin metier.

### Repository (persistence)

Role: encapsuler SQL.

- expose `is_clinician()` (role uniquement)
- conserve `is_active_clinician()` (utile pour d'autres cas, ex selection par defaut)
- fait l'`UPDATE patients SET assigned_clinician_id = ...`

### Database (integrite)

Role: garantir la coherence structurelle.

- `assigned_clinician_id INTEGER NOT NULL REFERENCES users(id)`
- impossible d'avoir une affectation vers un utilisateur inexistant

---

## 4) Flux technique de la reaffectation (pas a pas)

1. Le client appelle `POST /api/patients/{id}/assign`
2. FastAPI injecte `AdminUser` -> si non admin: 403
3. DTO `PatientAssignIn` valide:
   - `clinician_id >= 1`
   - alias acceptes: `clinician_id`, `assigned_clinician_id`, `assignedClinicianId`
   - champs inconnus refuses (`extra="forbid"`)
4. Le router appelle `patient_service.reassign_patient(...)`
5. Service:
   - check patient existe sinon 404
   - check cible est bien role `clinician`, sinon 400
   - si meme clinicien qu'avant -> operation idempotente (retour etat courant)
6. Repository execute l'update SQL + retour du patient mis a jour
7. Router retourne la representation mise a jour (200)

---

## 5) Decisions techniques clefs (et pourquoi)

### Decision A - Ajouter `is_clinician()` (port + repo)

Pourquoi:
- separer "type de compte autorise" de "etat actif"
- eviter de melanger deux besoins metiers differents

Avantage:
- logique explicite et maintenable

Inconvenient:
- une methode de plus a maintenir dans le contrat

### Decision B - Assouplir la regle de reaffectation

Pourquoi:
- le besoin dit explicitement que l'admin peut reaffecter vers un nouveau clinicien

Avantage:
- supprime le blocage fonctionnel reel

Inconvenient:
- un patient peut etre affecte temporairement a un clinicien inactif

### Decision C - DTO strict + alias

Pourquoi:
- compatibilite avec payloads front existants
- robustesse du contrat API

Avantage:
- moins de bugs d'integration, erreurs plus precises (422)

Inconvenient:
- contrat plus strict -> anciens clients permissifs peuvent casser

---

## 6) Preuves de non regression

Tests ajoutés/valides dans `test_patients.py`:

- reaffectation admin vers clinicien pending (nouveau cas critique)
- reaffectation avec alias payload (`assigned_clinician_id`)
- non-admin toujours bloque
- droits de visibilite patient conserves

Suite backend validee: `31 passed`.

---

## 7) Points de vigilance en revue technique

- Le choix "role clinician" vs "clinicien actif" est volontaire et metier.
- La contrainte SQL assure existence utilisateur, pas le role: le role est bien en service.
- `is_active_clinician()` n'est pas obsolete; il reste utile pour les chemins "selection par defaut".
- L'idempotence (reaffectation vers meme cible) evite des writes inutiles.

---

## 8) Pitch oral (60 secondes)

"On avait deja la chaine complete endpoint/service/repository, mais le service bloquait la reaffectation vers les nouveaux cliniciens car il exigeait `is_active`. On a separe les regles en introduisant `is_clinician` pour la reaffectation admin. On a aussi durci et assoupli a la fois le contrat d'entree: DTO strict pour interdire les champs parasites, mais alias de champ pour rester compatible avec les payloads existants. La persistence reste simple via `assigned_clinician_id` en FK, et les tests couvrent les cas critiques de reaffectation vers clinicien pending, alias payload, et blocage non-admin. Resultat: besoin metier respecte sans regression."
