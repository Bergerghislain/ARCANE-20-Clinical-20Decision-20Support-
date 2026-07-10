from __future__ import annotations

from typing import Any

import httpx

from ...settings import settings


def _is_cloud_llm_base(base_url: str) -> bool:
  lowered = base_url.lower()
  return "groq.com" in lowered or "openai.com" in lowered or "anthropic" in lowered


def _is_local_llm_base(base_url: str) -> bool:
  lowered = base_url.lower()
  return "127.0.0.1" in lowered or "localhost" in lowered


def probe_llm_status() -> dict[str, Any]:
  provider = (settings.llm_provider or "disabled").strip().lower()

  if provider == "disabled":
    return {
      "provider": provider,
      "ready": False,
      "message": (
        "LLM désactivé. Définissez LLM_PROVIDER=openai_compatible (Groq) "
        "ou mock_json dans .env puis redémarrez l'API."
      ),
    }

  if provider == "mock_json":
    return {
      "provider": provider,
      "ready": True,
      "message": "Mode simulation actif (réponses JSON sans réseau).",
    }

  if provider != "openai_compatible":
    return {
      "provider": provider,
      "ready": False,
      "message": f"Provider LLM inconnu : {provider}",
    }

  base = settings.llm_base_url.rstrip("/")
  model = settings.llm_model

  if _is_cloud_llm_base(base) and not settings.llm_api_key_effective:
    return {
      "provider": provider,
      "ready": False,
      "model": model,
      "base_url": base,
      "message": "LLM_API_KEY manquante. Ajoutez votre clé Groq dans .env.",
    }

  headers: dict[str, str] = {}
  if settings.llm_api_key_effective:
    headers["Authorization"] = f"Bearer {settings.llm_api_key_effective}"

  try:
    with httpx.Client(timeout=8.0) as client:
      resp = client.get(f"{base}/models", headers=headers)
  except httpx.RequestError:
    if _is_local_llm_base(base):
      return {
        "provider": provider,
        "ready": False,
        "model": model,
        "base_url": base,
        "message": (
          f"Serveur LLM local injoignable ({base}). "
          "Démarrez vLLM ou passez à Groq (api.groq.com)."
        ),
      }
    return {
      "provider": provider,
      "ready": False,
      "model": model,
      "base_url": base,
      "message": f"Endpoint LLM injoignable ({base}).",
    }

  if resp.status_code == 401:
    return {
      "provider": provider,
      "ready": False,
      "model": model,
      "base_url": base,
      "message": "Clé API LLM invalide ou expirée.",
    }

  if resp.status_code >= 400:
    return {
      "provider": provider,
      "ready": False,
      "model": model,
      "base_url": base,
      "message": f"Endpoint LLM a répondu {resp.status_code}. Vérifiez LLM_BASE_URL et LLM_MODEL.",
    }

  return {
    "provider": provider,
    "ready": True,
    "model": model,
    "base_url": base,
    "message": f"LLM prêt ({model}).",
  }
