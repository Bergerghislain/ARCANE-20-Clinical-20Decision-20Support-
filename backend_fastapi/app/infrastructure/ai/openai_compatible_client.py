from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import httpx

from ...application.errors import ApplicationError
from ...settings import settings
from .llm_resilience import LlmCircuitOpenError, call_with_retries, get_llm_circuit_breaker


class OpenAiCompatibleClient:
  """Client minimal pour un endpoint /v1/chat/completions (vLLM, sglang, TGI OpenAI compatible...)."""

  def _headers(self) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.llm_api_key_effective:
      headers["Authorization"] = f"Bearer {settings.llm_api_key_effective}"
    return headers

  def _chat_url(self) -> str:
    base = settings.llm_base_url.rstrip("/")
    return f"{base}/chat/completions"

  def _base_payload(self, messages: list[dict[str, Any]], *, stream: bool, json_mode: bool) -> dict[str, Any]:
    payload: dict[str, Any] = {
      "model": settings.llm_model,
      "messages": messages,
      "temperature": settings.llm_temperature,
      "top_p": settings.llm_top_p,
      "max_tokens": settings.llm_max_tokens,
      "stream": stream,
    }
    if json_mode:
      payload["response_format"] = {"type": "json_object"}
    return payload

  def _unreachable_message(self) -> str:
    base = settings.llm_base_url.rstrip("/")
    if "127.0.0.1" in base or "localhost" in base:
      return (
        f"Serveur LLM local injoignable ({base}). "
        "Démarrez vLLM ou configurez Groq dans .env."
      )
    if not settings.llm_api_key_effective:
      return "LLM_API_KEY manquante. Ajoutez votre clé Groq dans .env."
    return f"Endpoint LLM injoignable ({base})."

  def _post_sync(self, payload: dict[str, Any]) -> dict[str, Any]:
    url = self._chat_url()

    def _do_post() -> dict[str, Any]:
      with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
        resp = client.post(url, headers=self._headers(), json=payload)
        if resp.status_code >= 400:
          raise ApplicationError(f"LLM request failed ({resp.status_code}).", 502)
        return resp.json()

    try:
      return call_with_retries(_do_post, circuit=get_llm_circuit_breaker())
    except LlmCircuitOpenError as exc:
      raise ApplicationError("LLM temporarily unavailable (circuit open).", 503) from exc
    except ApplicationError:
      raise
    except httpx.RequestError as exc:
      raise ApplicationError(self._unreachable_message(), 502) from exc

  def chat(self, messages: list[dict[str, Any]]) -> str:
    if settings.llm_provider != "openai_compatible":
      raise ApplicationError("LLM provider is disabled.", 503)

    payload = self._base_payload(messages, stream=False, json_mode=True)
    try:
      data = self._post_sync(payload)
    except ApplicationError as error:
      if "LLM request failed (400)" in str(error.detail):
        payload = self._base_payload(messages, stream=False, json_mode=False)
        data = self._post_sync(payload)
      else:
        raise

    try:
      choices = data.get("choices") or []
      message = (choices[0] or {}).get("message") or {}
      return str(message.get("content") or "")
    except Exception as exc:
      raise ApplicationError("LLM response format is invalid.", 502) from exc

  async def stream_sse(self, messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    if settings.llm_provider != "openai_compatible":
      raise ApplicationError("LLM provider is disabled.", 503)

    url = self._chat_url()
    req_payload = self._base_payload(messages, stream=True, json_mode=True)
    circuit = get_llm_circuit_breaker()

    try:
      circuit.before_call()
      async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        async with client.stream("POST", url, headers=self._headers(), json=req_payload) as resp:
          if resp.status_code == 400:
            req_payload = self._base_payload(messages, stream=True, json_mode=False)
            async with client.stream(
              "POST", url, headers=self._headers(), json=req_payload
            ) as retry_resp:
              if retry_resp.status_code >= 400:
                circuit.record_failure()
                yield f"data: LLM request failed ({retry_resp.status_code}).\n\n"
                yield "data: [DONE]\n\n"
                return
              async for chunk in retry_resp.aiter_text():
                if chunk:
                  yield chunk
              circuit.record_success()
              return
          if resp.status_code >= 400:
            circuit.record_failure()
            yield f"data: LLM request failed ({resp.status_code}).\n\n"
            yield "data: [DONE]\n\n"
            return
          async for chunk in resp.aiter_text():
            if chunk:
              yield chunk
          circuit.record_success()
    except LlmCircuitOpenError:
      yield "data: LLM temporarily unavailable (circuit open).\n\n"
      yield "data: [DONE]\n\n"
    except httpx.RequestError:
      circuit.record_failure()
      yield f"data: {self._unreachable_message()}\n\n"
      yield "data: [DONE]\n\n"
