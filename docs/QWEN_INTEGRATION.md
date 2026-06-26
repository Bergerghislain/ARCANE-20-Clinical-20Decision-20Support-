# Intégration Qwen (IA) dans ARCANE

Ce document explique **en profondeur** comment ARCANE appelle des APIs d’IA (Qwen) pour :

- générer un **rapport** (bouton **Generate Report**),
- répondre dans l’espace **ARGOS** (chat clinique).

L’objectif principal est : **ne pas adapter le frontend à chaque fournisseur**.
Le frontend appelle **uniquement** votre backend FastAPI ; le backend agit comme **proxy** vers Qwen.

---

## 1) Pourquoi passer par FastAPI (et pas appeler Qwen depuis React)

- **Sécurité** : une clé API (Hugging Face / endpoint privé) ne doit jamais être dans le navigateur.
- **Stabilité** : vous changez de provider (vLLM, sglang, TGI, cloud…) sans toucher le frontend.
- **Traçabilité** : le backend peut logguer, limiter, filtrer, anonymiser.
- **Contrôle** : vous pouvez forcer un format de sortie (JSON) et valider la réponse.

---

## 2) Configuration (variables d’environnement)

Dans `.env` (racine du repo, utilisé par `backend_fastapi/app/settings.py`) :

```env
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=http://127.0.0.1:8001/v1
LLM_API_KEY=EMPTY
LLM_MODEL=Qwen/Qwen3-4B

LLM_TIMEOUT_SECONDS=120
LLM_TEMPERATURE=0.7
LLM_TOP_P=0.9
LLM_MAX_TOKENS=1200
```

Notes :
- `LLM_BASE_URL` attend un endpoint **OpenAI-compatible** (ex : vLLM/sglang).
- Si vous utilisez vLLM :
  - `vllm serve Qwen/Qwen3-4B --enable-reasoning --reasoning-parser deepseek_r1 --port 8001`
  - (vous obtenez un `POST /v1/chat/completions`)

---

## 3) Backend : le “contrat” IA

### 3.1 `LlmPort`
Fichier : `backend_fastapi/app/application/ports/llm_ports.py`

Ce port représente **l’interface minimaliste** de tout modèle LLM :
- on lui donne `messages` (format chat),
- il renvoie une `str`.

Cela permet de remplacer l’implémentation (HF, OpenAI, local…) sans changer la logique métier.

### 3.2 Client OpenAI-compatible
Fichier : `backend_fastapi/app/infrastructure/ai/openai_compatible_client.py`

Il appelle `POST {LLM_BASE_URL}/chat/completions` avec :
- `model`
- `messages`
- `temperature`, `top_p`, `max_tokens`

Puis il lit : `choices[0].message.content`.

### 3.3 Prompts + format JSON strict
Fichier : `backend_fastapi/app/infrastructure/ai/prompts.py`

Principe :
- on impose au modèle : “Tu DOIS répondre uniquement en JSON valide”.
- on envoie le **profil patient JSON** dans `profile_json`.

Cela évite du parsing fragile côté frontend et vous garantit un payload structuré.

### 3.4 Parsing JSON robuste
Fichier : `backend_fastapi/app/infrastructure/ai/json_parse.py`

Le modèle peut parfois ajouter du texte autour.
On extrait le premier bloc `{ ... }` parseable.

### 3.5 Service applicatif `AiService`
Fichier : `backend_fastapi/app/application/services/ai_service.py`

Deux méthodes :
- `generate_report(...)` → attend JSON `{ conclusion, reasoning, sources }`.
- `argos_respond(...)` → attend JSON `{ content, sections }`.

Si le JSON est invalide : erreurs 502 ou fallback texte.

### 3.6 Routes HTTP
Fichier : `backend_fastapi/app/routers/ai.py`

- `POST /api/ai/report` : génère un rapport IA.
- `POST /api/ai/argos/respond` : génère une réponse ARGOS.

Ces routes sont protégées par `ClinicianOrAdminUser` (auth JWT).

---

## 4) Frontend : où l’IA est branchée

### 4.1 Report (PatientFile)
Fichier : `client/pages/PatientFile.tsx`

Le bouton **Generate Report** :
- envoie `patient_name`, `patient_mrn`, `profile` à `/api/ai/report`,
- si l’appel échoue → fallback sur `buildSimulatedAiReport` (mode démo).

### 4.2 ARGOS (chat)
Fichier : `client/pages/ArgosSpace.tsx`

Quand l’utilisateur envoie un message :
- le front envoie contexte + historique à `/api/ai/argos/respond`,
- affiche la réponse IA dans l’UI (sections),
- si l’appel échoue → fallback `buildMockArgosResponse`.

---

## 5) Comment remplacer Qwen par un autre modèle sans changer l’app

Tant que votre endpoint expose **`/v1/chat/completions`** (OpenAI-compatible),
vous changez uniquement :

- `LLM_BASE_URL`
- `LLM_MODEL`
- (optionnel) `LLM_API_KEY`

Le reste de la plateforme ne bouge pas.

### 5.1 JSON mode (`LLM_JSON_MODE`)

Par défaut, le backend envoie `response_format: {"type": "json_object"}` (les
prompts imposent déjà du JSON strict, et vLLM ≥ 0.4 / sglang / TGI le supportent).
Si votre endpoint **rejette** `response_format`, mettez `LLM_JSON_MODE=false` :
on retombe alors sur l’extraction tolérante du premier bloc `{...}` (`json_parse.py`).

---

## 6) Valider l’IA réelle end-to-end

### 6.1 Avec un vrai modèle (vLLM/Qwen)

```bash
# Terminal A : le modèle
vllm serve Qwen/Qwen3-4B --port 8001

# Terminal B : validation end-to-end (report + argos + streaming)
export LLM_PROVIDER=openai_compatible
export LLM_BASE_URL=http://127.0.0.1:8001/v1
export LLM_MODEL=Qwen/Qwen3-4B
python backend_fastapi/scripts/llm_smoke.py --stream
```

`llm_smoke.py` appelle **la vraie couche métier** (`AiService` +
`OpenAiCompatibleClient`), c’est-à-dire le même code que l’API. Code de sortie 0
si `generate_report` **et** `argos_respond` réussissent.

### 6.2 Sans GPU (stub OpenAI-compatible)

Pour exercer le **vrai chemin réseau** (`POST /v1/chat/completions`, JSON +
streaming SSE) sans modèle, un serveur OpenAI-compatible déterministe est fourni :

```bash
# Terminal A : stub réseau (réponses cliniques JSON déterministes)
python backend_fastapi/scripts/fake_openai_server.py --port 8001

# Terminal B
LLM_PROVIDER=openai_compatible python backend_fastapi/scripts/llm_smoke.py --stream
```

C’est aussi ce que fait l’app complète : lancez l’API avec
`LLM_PROVIDER=openai_compatible` pointée sur le stub, connectez-vous, puis
`POST /api/ai/report` et `POST /api/ai/argos/respond` renvoient du contenu généré
par l’endpoint.

### 6.3 Tests automatisés

- **`tests/test_ai_router_openai_e2e_integration.py`** : end-to-end *réel mais
  auto-suffisant* — démarre un vrai serveur HTTP OpenAI-compatible local et fait
  transiter les requêtes par tout le routeur FastAPI (report, argos, et les deux
  flux SSE). **Tourne en CI** (pas de DB requise : l’auth est bypassée via
  `dependency_overrides`). C’est la version « mockable » de l’intégration réelle.
- **`tests/test_llm_live_integration.py`** : test *live* contre un **vrai** vLLM,
  **sauté par défaut** (donc neutre en CI). Activez-le avec :
  `LLM_LIVE_TEST=1 LLM_PROVIDER=openai_compatible python -m pytest backend_fastapi/tests/test_llm_live_integration.py`.

