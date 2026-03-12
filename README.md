# ARCANE – Plateforme d'aide à la décision clinique
## Aperçu

ARCANE est une plateforme d'intelligence artificielle dédiée à l'aide à la décision clinique pour les
cancers rares. Elle repose sur une architecture d'agents spécialisés orchestrés par l'assistant IA
ARGOS, lequel structure et explicite le raisonnement clinique en s'appuyant sur les données
patients et sur une carte de connaissances médicale. Cette première
itération fournit un prototype fonctionnel destiné aux cliniciens ; les détails complets de
l'interface et des parcours utilisateur sont décrits dans le cahier des charges officiel et ne sont
pas repris ici.

## Architecture technique et choix technologiques

ARCANE adopte une architecture modulaire et orientée domaine assurant une séparation stricte
entre front‑end et back‑end. Les principaux composants sont :

Back‑end : API REST en Python propulsée par FastAPI.

Base de données : PostgreSQL, avec un script SQL (Database : arcane) définissant les tables
principales (users, patients, etc.).

Front‑end : Application monopage React/TypeScript utilisant Vite et Tailwind CSS.

Back-end unique : FastAPI est désormais l'unique backend d'exécution. L'ancien backend
Express n'est plus utilisé dans les scripts de développement/production.

Authentification : mécanismes JWT/OAuth2 pour sécuriser les accès.

## Structure du dépôt
client/        # code source React (pages, composants, styles)
backend_fastapi/ # API FastAPI (auth, patients, admin, argos)
shared/        # types/fonctions partagés côté frontend
Database: arcane  # script SQL décrivant le schéma PostgreSQL
vite.config.ts      # configuration Vite frontend (proxy /api -> FastAPI en dev)
package.json    # scripts npm/pnpm (dev frontend, start FastAPI, build)

## Installation et exécution

Assurez‑vous d'avoir Node.js (version LTS 22 ou ultérieure) installé et ajouté au PATH. Il est
recommandé d'utiliser pnpm :

### Cloner le dépôt
git clone https://github.com/Bergerghislain/ARCANE-20-Clinical-20Decision-20Support-.git
cd ARCANE-20-Clinical-20Decision-20Support-

### Installer les dépendances
pnpm install    # ou npm install

### Démarrer en développement
# Terminal 1: backend FastAPI
pnpm run dev:api

# Terminal 2: frontend Vite
pnpm run dev

### Construire puis lancer la version de production
pnpm run build
pnpm run start


Le frontend Vite est servi sur le port 8080 en développement. Les appels `/api/*` sont
proxifiés vers FastAPI (port 8000) via `vite.config.ts`. Des variables d'environnement peuvent
être placées dans un fichier `.env` pour personnaliser les comportements backend
(par exemple `PING_MESSAGE` pour l'endpoint `/api/ping`).

## Base de données

Le script Database : arcane décrit un schéma relationnel complet pour PostgreSQL. Il inclut
des tables pour gérer les utilisateurs (authentification et rôles), les patients, les cancers
primaires, les événements tumoraux, les biomarqueurs et les échantillons, ainsi que les relations
entre ces entités. Ce modèle est conçu pour un suivi longitudinal et l'intégration future de
données multimodales.

## Rôles et périmètre

La phase 1 cible principalement les cliniciens : ils disposent d'un accès sécurisé pour gérer
leurs patients et interagir avec l'assistant ARGOS. Les rôles de
chercheur et d'administrateur sont mentionnés pour préparer les évolutions futures, mais leurs
fonctions détaillées seront définies dans les prochaines versions du projet.

## Sécurité et conformité

La plateforme met l'accent sur la sécurité et la traçabilité : authentification robuste, journalisation
des actions et préparation à la conformité RGPD. Ces mécanismes garantissent que
chaque interaction et recommandation IA peut être auditée.

## Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration :

Forkez le dépôt et créez une nouvelle branche (git checkout -b feature/ma-fonctionnalite).

Effectuez vos modifications en respectant les conventions de codage et la séparation
frontend/back‑end.

Poussez votre branche sur votre fork et ouvrez une pull request décrivant clairement
votre contribution.

## Licence

Ce projet ne fournit pas encore de licence explicite. Le code est mis à disposition à titre
expérimental dans le cadre du projet ARCANE. Veuillez contacter l'équipe ARCANE pour les
modalités d'utilisation et de distribution.
