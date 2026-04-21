from __future__ import annotations

from typing import Any

import httpx

from ...settings import settings
from ...application.errors import ApplicationError


class OpenAiCompatibleClient:
  """Client minimal pour un endpoint /v1/chat/completions (vLLM, sglang, TGI OpenAI compatible...)."""

  def chat(self, messages: list[dict[str, Any]]) -> str:
    if settings.llm_provider != "openai_compatible":
      raise ApplicationError("LLM provider is disabled.", 503)

    base = settings.llm_base_url.rstrip("/")
    url = f"{base}/chat/completions"

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.llm_api_key:
      headers["Authorization"] = f"Bearer {settings.llm_api_key}"

    payload: dict[str, Any] = {
      "model": settings.llm_model,
      "messages": messages,
      "temperature": settings.llm_temperature,
      "top_p": settings.llm_top_p,
      "max_tokens": settings.llm_max_tokens,
      "stream": False,
      # Force la sortie au format JSON (OpenAI-compatible). vLLM le supporte.
      # Cela réduit fortement les réponses avec texte autour ou blocs <think>.
      "response_format": {"type": "json_object"},
    }

    try:
      with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
        resp = client.post(url, headers=headers, json=payload)
        if resp.status_code >= 400:
          raise ApplicationError(f"LLM request failed ({resp.status_code}).", 502)
        data = resp.json()
    except httpx.RequestError as exc:
      raise ApplicationError("LLM endpoint is unreachable.", 502) from exc

    try:
      choices = data.get("choices") or []
      message = (choices[0] or {}).get("message") or {}
      content = str(message.get("content") or "")
      return content
    except Exception as exc:
      raise ApplicationError("LLM response format is invalid.", 502) from exc

