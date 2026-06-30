from __future__ import annotations

import asyncio
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from backend_fastapi.app.application.services.ai_service import AiService
from backend_fastapi.app.infrastructure.ai.llm_resilience import get_llm_circuit_breaker
from backend_fastapi.app.infrastructure.ai.openai_compatible_client import OpenAiCompatibleClient
from backend_fastapi.app.settings import settings


class _FakeOpenAiHandler(BaseHTTPRequestHandler):
  def log_message(self, format, *args):  # noqa: A003, ANN001
    return

  def do_POST(self):  # noqa: N802
    length = int(self.headers.get("Content-Length", "0"))
    body = self.rfile.read(length)
    payload = json.loads(body.decode("utf-8"))
    stream = bool(payload.get("stream"))

    if stream:
      chunk = json.dumps(
        {"choices": [{"delta": {"content": '{"content":"ok stream","sections":null}'}}]},
      )
      self.send_response(200)
      self.send_header("Content-Type", "text/event-stream")
      self.end_headers()
      self.wfile.write(f"data: {chunk}\n\n".encode())
      self.wfile.write(b"data: [DONE]\n\n")
      return

    response = {
      "choices": [
        {
          "message": {
            "content": json.dumps(
              {
                "content": "Analyse ARGOS",
                "sections": {"clinicalSynthesis": "Synthèse test"},
              },
              ensure_ascii=False,
            )
          }
        }
      ]
    }
    self.send_response(200)
    self.send_header("Content-Type", "application/json")
    self.end_headers()
    self.wfile.write(json.dumps(response).encode("utf-8"))


@pytest.fixture
def fake_openai_server():
  get_llm_circuit_breaker().reset()
  server = HTTPServer(("127.0.0.1", 0), _FakeOpenAiHandler)
  port = server.server_address[1]
  thread = threading.Thread(target=server.serve_forever, daemon=True)
  thread.start()
  yield f"http://127.0.0.1:{port}/v1"
  server.shutdown()


@pytest.mark.integration
def test_openai_compatible_client_chat_against_fake_server(fake_openai_server: str):
  old_provider = settings.llm_provider
  old_base = settings.llm_base_url
  try:
    settings.llm_provider = "openai_compatible"
    settings.llm_base_url = fake_openai_server
    text = OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
    parsed = json.loads(text)
    assert parsed["content"] == "Analyse ARGOS"
  finally:
    settings.llm_provider = old_provider
    settings.llm_base_url = old_base


@pytest.mark.integration
def test_openai_compatible_client_stream_against_fake_server(fake_openai_server: str):
  old_provider = settings.llm_provider
  old_base = settings.llm_base_url

  async def _run() -> str:
    chunks: list[str] = []
    async for part in OpenAiCompatibleClient().stream_sse([{"role": "user", "content": "hi"}]):
      chunks.append(part)
    return "".join(chunks)

  try:
    settings.llm_provider = "openai_compatible"
    settings.llm_base_url = fake_openai_server
    joined = asyncio.run(_run())
    assert "ok stream" in joined
    assert "[DONE]" in joined
  finally:
    settings.llm_provider = old_provider
    settings.llm_base_url = old_base


@pytest.mark.integration
def test_ai_service_argos_end_to_end_with_openai_compatible(fake_openai_server: str):
  old_provider = settings.llm_provider
  old_base = settings.llm_base_url
  try:
    settings.llm_provider = "openai_compatible"
    settings.llm_base_url = fake_openai_server
    service = AiService(OpenAiCompatibleClient())
    out = service.argos_respond(
      patient_name="Jean",
      patient_mrn="PAT001",
      context_message=None,
      profile={"schemaVersion": 2},
      user_message="Quelle est la prochaine étape?",
      history=[],
      user_id=1,
    )
    assert "ARGOS" in out["content"] or "Analyse" in out["content"]
    assert out["sections"] is not None
  finally:
    settings.llm_provider = old_provider
    settings.llm_base_url = old_base
