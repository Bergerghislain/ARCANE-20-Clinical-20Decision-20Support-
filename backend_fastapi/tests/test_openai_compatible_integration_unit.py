"""Tests d'integration du client openai_compatible contre un faux endpoint OpenAI.

Utilise httpx.MockTransport pour exercer le vrai code de requete/parsing/retry/disjoncteur
sans serveur LLM reel. Valide ainsi le mode LLM_PROVIDER=openai_compatible de bout en bout.
"""
from __future__ import annotations

import asyncio
import types

import httpx
import pytest

import backend_fastapi.app.infrastructure.ai.openai_compatible_client as mod
from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.infrastructure.ai.openai_compatible_client import (
  OpenAiCompatibleClient,
  get_circuit_breaker,
)
from backend_fastapi.app.settings import settings


def _completion(content: str) -> dict:
  return {"choices": [{"message": {"role": "assistant", "content": content}}]}


@pytest.fixture
def llm_env(monkeypatch):
  """Active le provider, supprime le backoff, et reset le disjoncteur."""
  monkeypatch.setattr(settings, "llm_provider", "openai_compatible")
  monkeypatch.setattr(settings, "llm_retry_backoff_seconds", 0.0)
  get_circuit_breaker().reset()
  yield
  get_circuit_breaker().reset()


def _install_transport(monkeypatch, handler, *, calls: list | None = None):
  """Branche un MockTransport (sync + async) sur le module client."""
  def wrapped(request: httpx.Request) -> httpx.Response:
    if calls is not None:
      calls.append(request)
    return handler(request)

  transport = httpx.MockTransport(wrapped)

  def client_factory(**kwargs):
    return httpx.Client(transport=transport, timeout=kwargs.get("timeout"))

  def async_client_factory(**kwargs):
    return httpx.AsyncClient(transport=transport, timeout=kwargs.get("timeout"))

  monkeypatch.setattr(
    mod,
    "httpx",
    types.SimpleNamespace(
      Client=client_factory,
      AsyncClient=async_client_factory,
      RequestError=httpx.RequestError,
    ),
  )


def test_chat_success_returns_content(monkeypatch, llm_env):
  _install_transport(monkeypatch, lambda req: httpx.Response(200, json=_completion("Bonjour clinicien")))
  out = OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert out == "Bonjour clinicien"


def test_chat_sends_expected_payload(monkeypatch, llm_env):
  captured = []
  _install_transport(
    monkeypatch,
    lambda req: httpx.Response(200, json=_completion("ok")),
    calls=captured,
  )
  monkeypatch.setattr(settings, "llm_model", "Qwen/Qwen-test")
  OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert len(captured) == 1
  body = captured[0].content.decode()
  assert "Qwen/Qwen-test" in body
  assert "chat/completions" in str(captured[0].url)


def test_chat_retries_on_500_then_fails_502(monkeypatch, llm_env):
  monkeypatch.setattr(settings, "llm_max_retries", 2)
  calls = []
  _install_transport(monkeypatch, lambda req: httpx.Response(500, text="boom"), calls=calls)
  with pytest.raises(ApplicationError) as exc:
    OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert exc.value.status_code == 502
  assert len(calls) == 3  # 1 essai + 2 retries


def test_chat_retries_then_succeeds(monkeypatch, llm_env):
  monkeypatch.setattr(settings, "llm_max_retries", 2)
  state = {"n": 0}

  def handler(req):
    state["n"] += 1
    if state["n"] == 1:
      return httpx.Response(503, text="warming up")
    return httpx.Response(200, json=_completion("recovered"))

  _install_transport(monkeypatch, handler)
  out = OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert out == "recovered"
  assert state["n"] == 2


def test_chat_4xx_not_retried(monkeypatch, llm_env):
  monkeypatch.setattr(settings, "llm_max_retries", 3)
  calls = []
  _install_transport(monkeypatch, lambda req: httpx.Response(400, text="bad"), calls=calls)
  with pytest.raises(ApplicationError) as exc:
    OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert exc.value.status_code == 502
  assert len(calls) == 1  # pas de retry sur 4xx


def test_chat_network_error_maps_502(monkeypatch, llm_env):
  monkeypatch.setattr(settings, "llm_max_retries", 1)

  def handler(req):
    raise httpx.ConnectError("refused", request=req)

  _install_transport(monkeypatch, handler)
  with pytest.raises(ApplicationError) as exc:
    OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert exc.value.status_code == 502


def test_circuit_breaker_opens_and_short_circuits(monkeypatch, llm_env):
  monkeypatch.setattr(settings, "llm_max_retries", 0)
  get_circuit_breaker().threshold = 1
  calls = []
  _install_transport(monkeypatch, lambda req: httpx.Response(500, text="down"), calls=calls)

  # 1er appel: echec -> ouvre le circuit
  with pytest.raises(ApplicationError):
    OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert len(calls) == 1

  # 2e appel: circuit ouvert -> 503 immediat, sans toucher le transport
  with pytest.raises(ApplicationError) as exc:
    OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert exc.value.status_code == 503
  assert len(calls) == 1  # aucun nouvel appel reseau


def test_stream_sse_yields_chunks(monkeypatch, llm_env):
  _install_transport(
    monkeypatch,
    lambda req: httpx.Response(200, text='data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n'),
  )

  async def collect():
    out = []
    async for chunk in OpenAiCompatibleClient().stream_sse([{"role": "user", "content": "hi"}]):
      out.append(chunk)
    return "".join(out)

  text = asyncio.run(collect())
  assert "[DONE]" in text


def test_stream_sse_4xx_yields_error_then_done(monkeypatch, llm_env):
  _install_transport(monkeypatch, lambda req: httpx.Response(429, text="rate limited"))

  async def collect():
    out = []
    async for chunk in OpenAiCompatibleClient().stream_sse([{"role": "user", "content": "hi"}]):
      out.append(chunk)
    return "".join(out)

  text = asyncio.run(collect())
  assert "LLM request failed (429)." in text
  assert "[DONE]" in text


def test_stream_sse_network_error_yields_unreachable(monkeypatch, llm_env):
  def handler(req):
    raise httpx.ConnectError("refused", request=req)

  _install_transport(monkeypatch, handler)

  async def collect():
    out = []
    async for chunk in OpenAiCompatibleClient().stream_sse([{"role": "user", "content": "hi"}]):
      out.append(chunk)
    return "".join(out)

  text = asyncio.run(collect())
  assert "unreachable" in text
  assert "[DONE]" in text


def test_stream_sse_disabled_provider_raises_503(monkeypatch):
  monkeypatch.setattr(settings, "llm_provider", "disabled")

  async def run():
    gen = OpenAiCompatibleClient().stream_sse([{"role": "user", "content": "hi"}])
    return await gen.__anext__()

  with pytest.raises(ApplicationError) as exc:
    asyncio.run(run())
  assert exc.value.status_code == 503


def test_chat_disabled_provider_raises_503(monkeypatch):
  monkeypatch.setattr(settings, "llm_provider", "disabled")
  get_circuit_breaker().reset()
  with pytest.raises(ApplicationError) as exc:
    OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
  assert exc.value.status_code == 503
