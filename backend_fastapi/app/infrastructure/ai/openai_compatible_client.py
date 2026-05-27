from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import httpx

from ...application.errors import ApplicationError
from ...settings import settings


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

    url = self._chat_url()
    payload = self._base_payload(messages, stream=False)

    try:
      with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
        resp = client.post(url, headers=self._headers(), json=payload)
        if resp.status_code >= 400:
          raise ApplicationError(f"LLM request failed ({resp.status_code}).", 502)
        data = resp.json()
    except httpx.RequestError as exc:
      raise ApplicationError("LLM endpoint is unreachable.", 502) from exc

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
