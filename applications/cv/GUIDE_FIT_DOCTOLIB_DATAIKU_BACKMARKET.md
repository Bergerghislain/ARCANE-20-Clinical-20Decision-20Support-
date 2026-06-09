# Analyse rigoureuse des 3 offres et strategie CV

Profil de reference utilise :

- Ensimag, diplome 2025.
- Experience principale : ARCANE, plateforme clinique full-stack / IA.
- Stack defendable : Python, FastAPI, React, TypeScript, PostgreSQL, Alembic, Docker, GitHub Actions, tests.
- Competences transverses : APIs, data modeling, CI/CD, securite applicative, workflows sante, LLM/ARGOS, produit.
- Points a ne pas survendre : experience JVM/Spring, Angular, Go, Kafka/Celery, paiements/distributed systems a grande echelle.

---

## Verdict rapide

| Offre | Fit estime | Verdict | CV a utiliser |
|---|---:|---|---|
| Dataiku - Fullstack Software Engineer, Core | 88-92% | Excellent fit. Stack-agnostic, junior/mid/senior, vrai produit data/IA. | `cv_dataiku_fullstack_core.tex` |
| Doctolib - Pipeline Software Engineer Fullstack Java / React | 78-82% | Tres bon fit produit sante + React/tests, mais gap JVM/Spring a assumer. | `cv_doctolib_pipeline_fullstack.tex` |
| Back Market - Software Engineer Payment | 68-72% | Stretch backend interessant si Barcelone OK. Bon match Python/FastAPI, gap payments/Go/distributed systems. | `cv_backmarket_payment.tex` |

Ordre recommande :

1. **Dataiku** : meilleure combinaison nom + fit + stack + seniority ouverte.
2. **Doctolib** : tres coherente avec ton experience sante/produit.
3. **Back Market** : candidature selective, seulement si Barcelone/hybrid + paiement/marketplace t'interessent vraiment.

---

## 1. Dataiku - Fullstack Software Engineer, Core

### Ce que l'offre cherche

Dataiku cherche des engineers capables de contribuer au coeur de DSS : data preparation, AI features, visualization, MLOps, platform scalability. L'offre est stack-agnostic et recrute a plusieurs niveaux, dont junior. Les signaux importants :

- experience significative de construction d'un vrai produit ;
- passion pour backend performance + frontend UX ;
- Python, Java, Angular/AngularJS selon les themes ;
- AI/data/MLOps/platform ;
- environnement scale-up, produit technique, utilisateurs data.

### Pourquoi tu es un tres bon fit

Ton angle fort :

- ARCANE est un **vrai produit data/IA**, pas un simple projet scolaire.
- Tu as du backend Python/FastAPI, PostgreSQL, schema evolution, tests, CI.
- Tu as du frontend React/TypeScript et des workflows utilisateurs.
- Tu as integre des LLMs avec abstraction provider, mock de test, SSE streaming.
- Tu peux parler de data validation, JSONB, imports JSON, profils patients versionnes.

### Gap a gerer

- Dataiku mentionne Java et Angular sur plusieurs themes. Tu dois dire : "J'ai une base Java/OOP et je suis productif sur TypeScript/React ; je suis a l'aise pour apprendre Angular/Java dans une codebase existante."
- Ne pas pretendre avoir fait du MLOps a grande echelle. Dire plutot : "J'ai construit des briques qui touchent a l'IA en production : integration LLM, tests, modes mock, streaming, monitoring mindset."

### Message de candidature

> I am applying because Dataiku is exactly the kind of engineering environment I am looking for: deep product, data/AI platform, and real users. My strongest recent experience is ARCANE, a clinical decision-support platform where I built full-stack data workflows with React/TypeScript, Python/FastAPI, PostgreSQL, tests and LLM integration. I am stack-agnostic, comfortable moving between backend architecture and product UX, and I would be especially excited to contribute to Data Preparation, AI features or MLOps-related Core teams.

---

## 2. Doctolib - Pipeline Software Engineer Fullstack Java / React

### Ce que l'offre cherche

Doctolib met l'accent sur :

- React + TypeScript ;
- ecosysteme JVM : Java, Kotlin, Spring Boot ;
- user-first mindset ;
- code secure, teste, pragmatique ;
- collaboration PM/design/engineers ;
- qualite, revue de code, pair programming ;
- produit sante a grande echelle.

### Pourquoi tu es un bon fit

Tes atouts :

- Domaine sante : rare et directement credible pour Doctolib.
- React/TypeScript : match direct.
- Tests frontend/backend : gros signal pour leur culture qualite.
- Securite applicative : JWT, cookies httpOnly, roles, CORS, donnees patients.
- Produit : dashboard patient, workflows cliniciens/admin, UX utile.

### Gap a gerer

- Le vrai gap est JVM/Spring Boot. Ton CV mentionne Java/OOP, mais ne doit pas mentir sur Spring.
- Pendant l'entretien, il faut assumer : "Je n'ai pas encore une experience Spring Boot forte, mais j'ai construit des APIs backend maintenables en FastAPI, j'ai une formation solide Java/OOP, et je peux transferer mes habitudes de tests/API design/service architecture."

### Message de candidature

> I am especially interested in Doctolib because my strongest project so far is in healthcare software. I built ARCANE, a clinical decision-support platform with React/TypeScript, Python/FastAPI and PostgreSQL, including patient workflows, role-based access, tests and CI. I know the role uses the JVM ecosystem; my production backend experience is mostly Python/FastAPI, but I have strong Java/OOP foundations and I am confident I can ramp up quickly while contributing immediately on React, TypeScript, APIs, product quality and healthcare user workflows.

---

## 3. Back Market - Software Engineer Payment / Payout

### Ce que l'offre cherche

Back Market Payment/Payout cherche plutot un backend engineer capable de :

- construire et operer des services loosely coupled ;
- travailler dans un environnement build/run/monitor/support ;
- contribuer a des paiements fiables et securises ;
- comprendre APIs, data architecture, microservices, distributed systems ;
- backend stack : Python/FastAPI, SQLAlchemy, Celery, Go, Django legacy ;
- data/infra : PostgreSQL, Redis, Kafka, RabbitMQ, GCP, Kubernetes, Datadog, ArgoCD, CircleCI.

### Pourquoi tu peux etre un fit

Atouts reels :

- Python/FastAPI : match tres direct.
- PostgreSQL/Alembic/API design : match fort.
- Securite/privacy dans un contexte sante : transferable vers payment/compliance.
- Tests + CI + Docker : bon signal build/run.
- Fullstack mindset utile meme si role backend.

### Pourquoi c'est plus risque

- L'offre demande souvent 2+ ans backend ou mid-level.
- Tu n'as pas encore Go, Celery/Kafka/RabbitMQ ou payment domain en experience forte.
- Le system design sera plus difficile que Dataiku/Doctolib.
- Barcelone/hybrid doit etre une vraie preference, pas juste "pour essayer".

### Si tu postules

Positionnement :

- Ne pas parler principalement d'IA.
- Parler backend, APIs, securite, donnees, tests, migration, ownership.
- Dire clairement que tu veux monter en maturite sur distributed systems et payment reliability.

Message :

> I am applying to Back Market because I want to grow as a backend engineer on reliable, secure, business-critical systems. My strongest experience is building Python/FastAPI APIs, PostgreSQL-backed workflows, authentication/authorization, CI and deployment paths for a healthcare platform where correctness and privacy mattered. I know the Payment/Payout domain involves stronger distributed-system constraints than my current experience; that is exactly the kind of engineering environment I want to grow into, and I can already contribute on Python services, API design, tests and data modeling.

---

## Preparations d'entretien par offre

### Dataiku

Preparer :

- expliquer ARCANE comme un produit data/IA ;
- parler schema evolution, JSON import, validation, SQL/PostgreSQL ;
- expliquer l'abstraction LLM et le mock provider ;
- reviser Python, API design, SQL, tests ;
- lire un peu Angular/Java si l'equipe cible le demande.

Questions probables :

- "How do you design a testable full-stack feature?"
- "How would you model evolving user data?"
- "How do you keep UX responsive while backend work is complex?"
- "How do you test an external AI integration?"

### Doctolib

Preparer :

- user-first healthcare story ;
- React/TypeScript component testing ;
- securite auth/cookies/roles ;
- expliquer comment tu apprendrais Spring Boot ;
- parler collaboration PM/design/cliniciens.

Questions probables :

- "Tell us about a feature you shipped end to end."
- "How do you ensure code quality?"
- "How do you handle sensitive healthcare data?"
- "How comfortable are you with Java/Spring?"

### Back Market

Preparer :

- backend design : API contracts, transactions, idempotency ;
- system design simple : payment/payout lifecycle, retries, consistency ;
- PostgreSQL schema and migrations ;
- basics Kafka/queues/Celery, Redis, observability ;
- tests and monitoring.

Questions probables :

- "Design a payout status API."
- "How would you make a payment operation idempotent?"
- "How do you handle retries and failures?"
- "How would you split services while keeping low coupling?"

---

## Ce qu'il faut modifier avant envoi

Dans chaque fichier LaTeX :

1. remplacer `TODO@email.com` ;
2. remplacer `linkedin.com/in/TODO` ;
3. remplacer `github.com/TODO` ;
4. ajuster les dates exactes de tes experiences ;
5. si une experience Dassault/Inria a un nom/projet precis, remplacer "Engineering internships and applied software projects" par les titres exacts.

Important : les CVs sont volontairement honnetes sur les gaps. Cela rend la candidature plus credible qu'un CV qui pretend maitriser Spring/Go/Kafka sans preuve.
