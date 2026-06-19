from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import httpx

from ...application.errors import ApplicationError
from ...settings import settings
from .circuit_breaker import CircuitBreaker

# Disjoncteur partage par tous les clients (etat de l'endpoint LLM).
_breaker = CircuitBreaker(
  threshold=settings.llm_circuit_breaker_threshold,
  reset_seconds=settings.llm_circuit_breaker_reset_seconds,
)


def get_circuit_breaker() -> CircuitBreaker:
  return _breaker


class OpenAiCompatibleClient:
  """Client minimal pour un endpoint /v1/chat/completions (vLLM, sglang, TGI OpenAI compatible...)."""

  def _headers(self) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.llm_api_key:
      headers["Authorization"] = f"Bearer {settings.llm_api_key}"
    return headers

  def _chat_url(self) -> str:
    base = settings.llm_base_url.rstrip("/")
    return f"{base}/chat/completions"

  def _base_payload(self, messages: list[dict[str, Any]], *, stream: bool) -> dict[str, Any]:
    return {
      "model": settings.llm_model,
      "messages": messages,
      "temperature": settings.llm_temperature,
      "top_p": settings.llm_top_p,
      "max_tokens": settings.llm_max_tokens,
      "stream": stream,
      "response_format": {"type": "json_object"},
    }

  def chat(self, messages: list[dict[str, Any]]) -> str:
    if settings.llm_provider != "openai_compatible":
      raise ApplicationError("LLM provider is disabled.", 503)
    if _breaker.is_open():
      raise ApplicationError("LLM temporairement indisponible (circuit ouvert).", 503)

    url = self._chat_url()
    payload = self._base_payload(messages, stream=False)
    max_retries = max(0, int(settings.llm_max_retries))
    backoff = float(settings.llm_retry_backoff_seconds)
    last_error: ApplicationError | None = None

    for attempt in range(max_retries + 1):
      try:
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
          resp = client.post(url, headers=self._headers(), json=payload)
      except httpx.RequestError as exc:
        last_error = ApplicationError("LLM endpoint is unreachable.", 502)
        if attempt < max_retries:
          time.sleep(backoff * (2 ** attempt))
          continue
        _breaker.record_failure()
        raise last_error from exc

      status = resp.status_code
      if status >= 500:
        # Erreur serveur transitoire: on retente (backoff exponentiel).
        last_error = ApplicationError(f"LLM request failed ({status}).", 502)
        if attempt < max_retries:
          time.sleep(backoff * (2 ** attempt))
          continue
        _breaker.record_failure()
        raise last_error
      if status >= 400:
        # Erreur client (non transitoire): pas de retry, n'ouvre pas le circuit.
        raise ApplicationError(f"LLM request failed ({status}).", 502)

      # 2xx: endpoint operationnel.
      _breaker.record_success()
      try:
        data = resp.json()
        choices = data.get("choices") or []
        message = (choices[0] or {}).get("message") or {}
        return str(message.get("content") or "")
      except Exception as exc:
        raise ApplicationError("LLM response format is invalid.", 502) from exc

    raise last_error or ApplicationError("LLM request failed.", 502)

  async def stream_sse(self, messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    if settings.llm_provider != "openai_compatible":
      raise ApplicationError("LLM provider is disabled.", 503)

    url = self._chat_url()
    req_payload = self._base_payload(messages, stream=True)

    try:
      async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        async with client.stream("POST", url, headers=self._headers(), json=req_payload) as resp:
          if resp.status_code >= 400:
            detail = f"LLM request failed ({resp.status_code})."
            yield f"data: {detail}\n\n"
            yield "data: [DONE]\n\n"
            return
          async for chunk in resp.aiter_text():
            if chunk:
              yield chunk
    except httpx.RequestError:
      yield "data: LLM endpoint is unreachable.\n\n"
      yield "data: [DONE]\n\n"
