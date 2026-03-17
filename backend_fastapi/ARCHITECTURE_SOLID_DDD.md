## Architecture SOLID + DDD (backend FastAPI)

Ce document explique l'organisation cible du backend après le refactoring.

### 1) Couches introduites

- `app/domain`  
  Entités métier et énumérations (`User`, `AdminListStatus`, `ValidationAction`).

- `app/application`  
  Cas d'usage (services) + contrats (ports/interfaces).

- `app/infrastructure`  
  Implémentations techniques (repositories SQL, adaptateurs JWT/hash, Unit of Work).

- `app/routers`  
  Interface HTTP uniquement : validation d'entrée/sortie + mapping des erreurs.

### 2) Principes SOLID appliqués

- **S (Single Responsibility)**  
  Les routeurs ne contiennent plus de logique métier ni SQL.

- **O (Open/Closed)**  
  La stratégie admin par statut/action est extensible via mapping de stratégies dans `AdminService`.

- **I (Interface Segregation)**  
  Les services dépendent de ports dédiés (`auth_ports`, `admin_ports`, `patient_ports`, `argos_ports`).

- **D (Dependency Inversion)**  
  Les services dépendent d'interfaces; `deps.py` injecte les implémentations SQL/JWT concrètes.

### 3) Patterns utilisés

- **Repository Pattern** : accès données isolé dans `app/infrastructure/repositories`.
- **Service Layer** : orchestration métier dans `app/application/services`.
- **Unit of Work** : transactions centralisées dans `app/infrastructure/db/unit_of_work.py`.
- **Strategy** : gestion des statuts/actions admin dans `AdminService`.

### 4) Règles de maintenance

- Une nouvelle règle métier => `application/services`.
- Une nouvelle requête SQL => repository dédié.
- Un nouvel endpoint => routeur fin + appel service.
- Une nouvelle dépendance externe (cache, broker, IA, etc.) => adaptateur infrastructure + port application.

### 5) Étape suivante recommandée

Créer des tests unitaires ciblés par service (`AuthService`, `PatientService`, `ArgosService`) en mockant les ports, puis garder les tests API en complément.

