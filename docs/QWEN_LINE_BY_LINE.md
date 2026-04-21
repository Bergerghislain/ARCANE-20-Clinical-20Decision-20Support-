# Explication ligne par ligne (Qwen / IA)

Ce document explique **ligne par ligne** les deux fichiers qui font le “cœur” de l’intégration IA :

- `backend_fastapi/app/infrastructure/ai/openai_compatible_client.py`
- `backend_fastapi/app/application/services/ai_service.py`

Objectif : te permettre d’intégrer un serveur Qwen (ou n’importe quel modèle) via une API **OpenAI-compatible**, sans devoir retoucher le frontend.

---

## 1) `openai_compatible_client.py` — client HTTP vers `/v1/chat/completions`

Fichier : `backend_fastapi/app/infrastructure/ai/openai_compatible_client.py`

### L1
`from __future__ import annotations`

- Active les annotations “en mode string” par défaut (Python 3.11+).  
- Utile pour éviter certains problèmes de références circulaires et réduire le coût d’évaluation des types.

### L3
`from typing import Any`

- `Any` sert à typer des structures JSON flexibles (`dict[str, Any]`) qui viennent du frontend ou du LLM.

### L5
`import httpx`

- `httpx` est un client HTTP moderne (sync/async).  
- Ici on l’utilise en **synchrone**, car les endpoints FastAPI actuels appellent des services sync dans un threadpool.

### L7
`from ...settings import settings`

- Importe la config Pydantic (`Settings`) chargée depuis `.env`.  
- On récupère : `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, etc.

### L8
`from ...application.errors import ApplicationError`

- Erreur métier unifiée du backend (contient un `status_code` et un `detail`).  
- Permet de renvoyer des erreurs HTTP cohérentes (`502`, `503`) sans exposer de stacktrace.

### L11–L13
```py
class OpenAiCompatibleClient:
  \"\"\"Client minimal pour un endpoint /v1/chat/completions (...)\"\"\"
```

- Classe “adaptateur infrastructure” : elle parle au monde externe (LLM).  
- Elle ne connaît pas les détails du domaine patient, uniquement `messages` → `content`.

### L14
`def chat(self, messages: list[dict[str, Any]]) -> str:`

- Contrat minimal : on envoie une conversation au format OpenAI (`[{role, content}, ...]`).  
- On récupère une `str` (le texte brut retourné par le modèle).

### L15–L16
```py
if settings.llm_provider != "openai_compatible":
  raise ApplicationError("LLM provider is disabled.", 503)
```

- Garde-fou : si tu n’as pas activé l’IA, on renvoie **503 Service Unavailable**.  
- Ça permet au frontend de faire un **fallback** (report simulé / réponse mock).

### L18–L19
```py
base = settings.llm_base_url.rstrip("/")
url = f"{base}/chat/completions"
```

- Construit l’URL finale.  
- Exemple : `LLM_BASE_URL=http://127.0.0.1:8001/v1` → `http://127.0.0.1:8001/v1/chat/completions`.

### L21–L23
```py
headers = {"Content-Type": "application/json"}
if settings.llm_api_key:
  headers["Authorization"] = f"Bearer {settings.llm_api_key}"
```

- Envoie du JSON.  
- Ajoute un header `Authorization` si tu utilises une gateway / un provider protégé.  
- Avec un serveur local vLLM, tu peux mettre `LLM_API_KEY=EMPTY`.

### L25–L32
```py
payload = {
  "model": settings.llm_model,
  "messages": messages,
  "temperature": settings.llm_temperature,
  "top_p": settings.llm_top_p,
  "max_tokens": settings.llm_max_tokens,
  "stream": False,
}
```

- Structure standard OpenAI-compatible.  
- `model` : par ex. `Qwen/Qwen3-4B` (selon ce que ton serveur expose).  
- `messages` : conversation.  
- Paramètres d’échantillonnage (`temperature`, `top_p`) + limite de sortie (`max_tokens`).  
- `stream=False` simplifie : on veut un JSON final, pas des tokens incrémentaux (on pourra streamer plus tard si besoin).

### L34–L41
```py
with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
  resp = client.post(url, headers=headers, json=payload)
  ...
except httpx.RequestError:
  raise ApplicationError("LLM endpoint is unreachable.", 502)
```

- Envoie la requête au serveur LLM.  
- `timeout` évite que l’API FastAPI reste bloquée indéfiniment.  
- Si le réseau échoue : on renvoie **502 Bad Gateway** (proxy backend → LLM HS).

### L37–L39
```py
if resp.status_code >= 400:
  raise ApplicationError(f"LLM request failed ({resp.status_code}).", 502)
data = resp.json()
```

- Si le LLM renvoie une erreur (400/401/500…), on la transforme en `502` côté backend (car du point de vue du client web, c’est un backend “gateway” qui n’a pas pu produire la réponse).

### L43–L47
```py
choices = data.get("choices") or []
message = (choices[0] or {}).get("message") or {}
content = str(message.get("content") or "")
return content
```

- Parse au format OpenAI : `choices[0].message.content`.  
- Retourne le texte brut.

### L48–L49
```py
except Exception:
  raise ApplicationError("LLM response format is invalid.", 502)
```

- Si le JSON n’a pas la forme attendue : on renvoie `502`.

---

## 2) `ai_service.py` — logique métier IA (report + ARGOS)

Fichier : `backend_fastapi/app/application/services/ai_service.py`

### L3–L4
`import json` / `from typing import Any`

- `Any` pour accepter le profil patient JSON.
- `json` n’est plus strictement nécessaire ici (tu pourrais le retirer), mais il n’est pas dangereux.

### L6
`from ..errors import ApplicationError`

- Même erreur métier unifiée côté application.

### L7
`from ..ports.llm_ports import LlmPort`

- Port (interface) : `chat(messages) -> str`.  
- Important : `AiService` dépend d’un **port** (abstraction), pas d’un client concret.

### L8–L12
Imports :
- `build_report_messages(...)` : fabrique un prompt “rapport” qui force un JSON.
- `build_argos_messages(...)` : fabrique un prompt “ARGOS” qui force un JSON.
- `extract_json_object(...)` : parse robuste pour extraire un objet JSON d’une réponse LLM.

### L15–L18
```py
class AiService:
  def __init__(self, llm: LlmPort):
    self._llm = llm
```

- Service applicatif : orchestration.  
- Injection de dépendance : on reçoit un `llm` (implémenté par `OpenAiCompatibleClient`).

---

### Génération de report : `generate_report(...)`

#### L19–L30
```py
messages = build_report_messages(...)
```

- Transforme tes données patient (JSON) en `messages` pour le modèle.  
- Le prompt inclut :
  - `profile_json` (ton JSON patient),
  - le format attendu `{conclusion, reasoning, sources}`,
  - des contraintes (“ne pas inventer…”).

#### L31
`text = self._llm.chat(messages)`

- Appelle le port LLM.  
- À ce stade, `text` est **une string brute**.

#### L32
`payload = extract_json_object(text)`

- Le modèle peut parfois renvoyer du texte autour (ou des retours ligne).  
- On tente d’extraire un objet JSON parseable.

#### L33–L34
```py
if not payload:
  raise ApplicationError("LLM response is not valid JSON.", 502)
```

- Si le modèle n’a pas respecté le contrat “JSON only”, on échoue en `502`.  
- Pourquoi `502` : c’est un “backend-proxy” qui n’a pas pu produire le format attendu.

#### L35–L41
On lit la forme :
- `conclusion` : string non vide
- `reasoning` : string non vide
- `sources` : liste de strings

Si la forme JSON est inattendue : `ApplicationError(..., 502)`.

#### L42–L44
Vérifie le contenu minimal, puis renvoie un dict.

---

### ARGOS : `argos_respond(...)`

#### L56–L63
`messages = build_argos_messages(...)`

- Construit un prompt qui inclut :
  - `patient` (name/mrn),
  - `context_message` (le contexte préparé dans le frontend),
  - `profile_json` (si disponible),
  - `chat_history` (un historique court),
  - `user_message`,
  - format attendu `{content, sections{...}}`.

#### L64–L65
Appel LLM + extraction JSON.

#### L66–L68 (fallback texte)
Si pas de JSON : on renvoie une réponse texte simple.  
Ça évite de “casser” l’UI si le modèle n’est pas strict.

#### L69–L73
Normalise :
- `content` : string
- `sections` : dict ou `None`

Puis renvoie `{content, sections}`.

---

## 3) Pourquoi forcer le JSON ?

Parce que ton app manipule des données structurées (sections patient) et ton UI attend :
- un report : `{conclusion, reasoning, sources}`
- une réponse ARGOS : `{content, sections}`

Le JSON :
- réduit le “glue code” fragile côté React,
- te permet de valider/rejeter les sorties LLM,
- rend le comportement stable (important en contexte clinique).

