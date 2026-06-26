"""End-to-end IA *reelle* (provider openai_compatible) a travers le routeur FastAPI.

Ce test demarre un **vrai serveur HTTP OpenAI-compatible** local (sockets reels)
et fait transiter les requetes par toute la chaine ARCANE :

    HTTP routeur FastAPI  ->  AiService  ->  OpenAiCompatibleClient
                          ->  POST /v1/chat/completions (serveur reel)  ->  reponse

Il ne necessite **pas** PostgreSQL (l'auth est bypassee via dependency_overrides),
donc il tourne aussi en CI : c'est la version "mockable" de l'integration reelle.
Pour un vrai modele (vLLM/Qwen), voir `tests/test_llm_live_integration.py`.
"""
from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from fastapi.testclient import TestClient

from backend_fastapi.app import deps
from backend_fastapi.app.infrastructure.ai.llm_resilience import get_llm_circuit_breaker
from backend_fastapi.app.main import app
from backend_fastapi.app.settings import settings

# Payloads recus par le serveur (pour verifier le contrat envoye par le client).
RECEIVED_PAYLOADS: list[dict] = []

_VALID_PROFILE = {
  "patientId": "1",
  "schemaVersion": 1,
  "diagnosis": "Adenocarcinome",
  "pathologySummary": "Lesion 28mm",
  "analyses": [],
  "report": {"conclusion": "c", "reasoning": "r", "sources": ["s"]},
}


def _content_for(messages: list[dict]) -> str:
  system = " ".join(
    str(m.get("content") or "")
    for m in messages
    if str(m.get("role") or "").lower() == "system"
  ).lower()
  if "argos" in system:
    return json.dumps(
      {
        "content": "Analyse ARGOS reelle (serveur OpenAI-compatible).",
        "sections": {
          "clinicalSynthesis": "Synthese cliniquetest",
          "hypotheses": ["H1", "H2"],
          "nextSteps": ["Etape 1"],
        },
      },
      ensure_ascii=False,
    )
  return json.dumps(
    {
      "conclusion": "Conclusion clinique reelle (openai_compatible).",
      "reasoning": "Raisonnement genere via /v1/chat/completions.",
      "sources": ["Guideline A"],
    },
    ensure_ascii=False,
  )


class _Handler(BaseHTTPRequestHandler):
  def log_message(self, *args):  # noqa: ANN002
    return

  def do_POST(self):  # noqa: N802
    length = int(self.headers.get("Content-Length", "0"))
    payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
    RECEIVED_PAYLOADS.append(payload)
    messages = payload.get("messages") or []
    content = _content_for(messages)

    if payload.get("stream"):
      self.send_response(200)
      self.send_header("Content-Type", "text/event-stream")
      self.end_headers()
      step = max(1, len(content) // 4)
      for i in range(0, len(content), step):
        chunk = {"choices": [{"delta": {"content": content[i : i + step]}}]}
        self.wfile.write(f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
      self.wfile.write(b"data: [DONE]\n\n")
      return

    body = json.dumps(
      {"choices": [{"message": {"role": "assistant", "content": content}}]},
    ).encode("utf-8")
    self.send_response(200)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)


@pytest.fixture
def real_openai_endpoint():
  """Serveur OpenAI-compatible local + provider settings pointant dessus."""
  RECEIVED_PAYLOADS.clear()
  get_llm_circuit_breaker().reset()
  server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
  port = server.server_address[1]
  thread = threading.Thread(target=server.serve_forever, daemon=True)
  thread.start()

  old_provider = settings.llm_provider
  old_base = settings.llm_base_url
  settings.llm_provider = "openai_compatible"
  settings.llm_base_url = f"http://127.0.0.1:{port}/v1"

  app.dependency_overrides[deps.get_current_user] = lambda: {"id": 1, "role": "admin"}
  try:
    yield
  finally:
    settings.llm_provider = old_provider
    settings.llm_base_url = old_base
    app.dependency_overrides.clear()
    server.shutdown()


def test_generate_report_end_to_end_real_endpoint(real_openai_endpoint):
  with TestClient(app) as client:
    resp = client.post(
      "/api/ai/report",
      json={"patient_name": "Jean", "patient_mrn": "PAT001", "profile": _VALID_PROFILE},
    )
  assert resp.status_code == 200, resp.text
  data = resp.json()
  assert data["conclusion"].startswith("Conclusion clinique reelle")
  assert data["reasoning"]
  assert data["sources"] == ["Guideline A"]


def test_argos_respond_end_to_end_real_endpoint(real_openai_endpoint):
  with TestClient(app) as client:
    resp = client.post(
      "/api/ai/argos/respond",
      json={"user_message": "Prochaines etapes ?", "profile": _VALID_PROFILE, "history": []},
    )
  assert resp.status_code == 200, resp.text
  data = resp.json()
  assert "ARGOS" in data["content"]
  assert data["sections"]["hypotheses"] == ["H1", "H2"]


def test_report_stream_end_to_end_real_endpoint(real_openai_endpoint):
  with TestClient(app) as client:
    resp = client.post(
      "/api/ai/report/stream",
      json={"patient_name": "Jean", "patient_mrn": None, "profile": _VALID_PROFILE},
    )
  assert resp.status_code == 200, resp.text
  assert "data:" in resp.text
  assert "[DONE]" in resp.text


def test_argos_stream_end_to_end_real_endpoint(real_openai_endpoint):
  with TestClient(app) as client:
    resp = client.post(
      "/api/ai/argos/respond/stream",
      json={"user_message": "Synthese ?", "history": []},
    )
  assert resp.status_code == 200, resp.text
  assert "[DONE]" in resp.text
  # Reassemble le contenu des deltas et verifie que c'est du JSON ARGOS valide.
  assembled = ""
  for line in resp.text.splitlines():
    line = line.strip()
    if not line.startswith("data:"):
      continue
    data = line[5:].strip()
    if data == "[DONE]" or not data:
      continue
    chunk = json.loads(data)
    assembled += chunk["choices"][0]["delta"]["content"]
  parsed = json.loads(assembled)
  assert "content" in parsed


def test_client_sends_response_format_when_json_mode_enabled(real_openai_endpoint):
  old = settings.llm_json_mode
  settings.llm_json_mode = True
  try:
    with TestClient(app) as client:
      client.post(
        "/api/ai/report",
        json={"patient_name": "Jean", "patient_mrn": None, "profile": _VALID_PROFILE},
      )
    assert RECEIVED_PAYLOADS, "le serveur n'a recu aucun payload"
    assert RECEIVED_PAYLOADS[-1].get("response_format") == {"type": "json_object"}
  finally:
    settings.llm_json_mode = old


def test_client_omits_response_format_when_json_mode_disabled(real_openai_endpoint):
  old = settings.llm_json_mode
  settings.llm_json_mode = False
  try:
    with TestClient(app) as client:
      resp = client.post(
        "/api/ai/report",
        json={"patient_name": "Jean", "patient_mrn": None, "profile": _VALID_PROFILE},
      )
    assert resp.status_code == 200, resp.text
    assert RECEIVED_PAYLOADS, "le serveur n'a recu aucun payload"
    assert "response_format" not in RECEIVED_PAYLOADS[-1]
  finally:
    settings.llm_json_mode = old
