#!/usr/bin/env python3
"""Serveur OpenAI-compatible minimal (stub) pour brancher l'IA *sans GPU*.

But: exercer le **vrai chemin reseau** du provider `openai_compatible`
(`POST /v1/chat/completions`, JSON et streaming SSE) en local, par exemple
pour valider l'integration ARCANE quand un vrai vLLM/Qwen n'est pas disponible
(poste sans GPU, CI, demo).

Ce n'est PAS un modele: les reponses sont deterministes mais respectent
exactement le **contrat OpenAI** (forme `choices[0].message.content`, deltas SSE
`choices[0].delta.content`, ligne finale `data: [DONE]`) et le **format JSON
clinique** attendu par ARCANE (rapport / ARGOS). Le reste de la plateforme ne
fait donc aucune difference avec un vrai serveur.

Pour un vrai modele, lancez vLLM a la place :
    vllm serve Qwen/Qwen3-4B --port 8001
puis pointez `LLM_BASE_URL=http://127.0.0.1:8001/v1`.

Usage:
    python backend_fastapi/scripts/fake_openai_server.py --host 127.0.0.1 --port 8001
"""
from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


def _is_argos(messages: list[dict[str, Any]]) -> bool:
  system = " ".join(
    str(m.get("content") or "")
    for m in messages
    if str(m.get("role") or "").lower() == "system"
  ).lower()
  return "argos" in system


def _extract_patient_name(messages: list[dict[str, Any]]) -> str:
  """Best-effort: retrouve le nom patient dans le payload utilisateur (JSON)."""
  for m in messages:
    content = str(m.get("content") or "")
    idx = content.find("{")
    if idx == -1:
      continue
    try:
      data = json.loads(content[idx : content.rfind("}") + 1])
    except Exception:
      continue
    patient = data.get("patient") if isinstance(data, dict) else None
    if isinstance(patient, dict) and patient.get("name"):
      return str(patient["name"])
  return "le patient"


def build_completion_content(messages: list[dict[str, Any]]) -> str:
  """Retourne la *string* JSON clinique (telle que renverrait un vrai modele)."""
  name = _extract_patient_name(messages)
  if _is_argos(messages):
    return json.dumps(
      {
        "content": f"Analyse clinique pour {name} (reponse du serveur OpenAI-compatible).",
        "sections": {
          "clinicalSynthesis": (
            f"Synthese structuree generee via /v1/chat/completions pour {name}."
          ),
          "hypotheses": [
            "Hypothese principale a confirmer par imagerie.",
            "Diagnostic differentiel a ecarter.",
          ],
          "arguments": ["Coherent avec le profil transmis."],
          "nextSteps": [
            "Completer le bilan biologique.",
            "Discuter en RCP.",
          ],
          "traceability": "Genere par fake_openai_server (stub OpenAI-compatible).",
        },
      },
      ensure_ascii=False,
    )
  return json.dumps(
    {
      "conclusion": (
        f"Conclusion clinique synthetique pour {name}, generee via un endpoint "
        "OpenAI-compatible."
      ),
      "reasoning": (
        "Raisonnement clinique base sur le profil JSON transmis au modele. "
        "Reponse produite par le vrai chemin reseau (POST /v1/chat/completions)."
      ),
      "sources": ["Guidelines cliniques (exemple)", "ARCANE / openai_compatible"],
    },
    ensure_ascii=False,
  )


class _Handler(BaseHTTPRequestHandler):
  def log_message(self, *_args):  # noqa: ANN002
    return

  def _send_json(self, status: int, body: dict[str, Any]) -> None:
    raw = json.dumps(body).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(raw)))
    self.end_headers()
    self.wfile.write(raw)

  def do_GET(self):  # noqa: N802
    # Certains clients sondent /v1/models : on repond une liste minimale.
    if self.path.rstrip("/").endswith("/models"):
      self._send_json(
        200,
        {"object": "list", "data": [{"id": "arcane-stub", "object": "model"}]},
      )
      return
    self._send_json(404, {"error": "not_found"})

  def do_POST(self):  # noqa: N802
    if not self.path.rstrip("/").endswith("/chat/completions"):
      self._send_json(404, {"error": "not_found"})
      return

    length = int(self.headers.get("Content-Length", "0"))
    try:
      payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
    except Exception:
      self._send_json(400, {"error": "invalid_json"})
      return

    messages = payload.get("messages") or []
    content = build_completion_content(messages)
    model = payload.get("model", "arcane-stub")

    if payload.get("stream"):
      self.send_response(200)
      self.send_header("Content-Type", "text/event-stream")
      self.send_header("Cache-Control", "no-cache")
      self.end_headers()
      # Streaming en plusieurs deltas, comme un vrai serveur.
      step = max(1, len(content) // 6)
      for i in range(0, len(content), step):
        chunk = {
          "choices": [{"index": 0, "delta": {"content": content[i : i + step]}}],
          "model": model,
        }
        self.wfile.write(f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
        self.wfile.flush()
      self.wfile.write(b"data: [DONE]\n\n")
      self.wfile.flush()
      return

    self._send_json(
      200,
      {
        "id": "chatcmpl-arcane-stub",
        "object": "chat.completion",
        "model": model,
        "choices": [
          {
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": "stop",
          }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
      },
    )


def serve(host: str, port: int) -> None:
  httpd = ThreadingHTTPServer((host, port), _Handler)
  print(f"[fake_openai_server] OpenAI-compatible stub on http://{host}:{port}/v1")
  print("[fake_openai_server] Set LLM_PROVIDER=openai_compatible and")
  print(f"[fake_openai_server]     LLM_BASE_URL=http://{host}:{port}/v1")
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    httpd.shutdown()


def main() -> None:
  parser = argparse.ArgumentParser(description="OpenAI-compatible stub server (no GPU).")
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=8001)
  args = parser.parse_args()
  serve(args.host, args.port)


if __name__ == "__main__":
  main()
