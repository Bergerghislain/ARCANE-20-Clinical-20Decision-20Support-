#!/usr/bin/env python3
"""Smoke test end-to-end de l'IA reelle (provider `openai_compatible`).

Valide que l'endpoint LLM configure (vLLM/Qwen, ou tout serveur OpenAI-compatible)
repond correctement pour les deux usages ARCANE :
  - generate_report (bouton "Generate Report")
  - argos_respond   (chat clinique ARGOS)

Il appelle la **vraie** couche metier (`AiService` + `OpenAiCompatibleClient`),
donc le meme code que l'API en production. Utile pour brancher un vrai modele :

    # 1) un vrai modele
    export LLM_PROVIDER=openai_compatible
    export LLM_BASE_URL=http://127.0.0.1:8001/v1
    export LLM_MODEL=Qwen/Qwen3-4B
    python backend_fastapi/scripts/llm_smoke.py

    # 2) sans GPU (stub OpenAI-compatible reseau)
    python backend_fastapi/scripts/fake_openai_server.py &  # port 8001
    LLM_PROVIDER=openai_compatible python backend_fastapi/scripts/llm_smoke.py

Sortie : exit code 0 si report ET argos reussissent, 1 sinon.
Option `--stream` : teste aussi les flux SSE.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Permet `python backend_fastapi/scripts/llm_smoke.py` depuis la racine du repo.
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
  sys.path.insert(0, str(_REPO_ROOT))

from backend_fastapi.app.application.errors import ApplicationError  # noqa: E402
from backend_fastapi.app.application.services.ai_service import AiService  # noqa: E402
from backend_fastapi.app.infrastructure.ai.openai_compatible_client import (  # noqa: E402
  OpenAiCompatibleClient,
)
from backend_fastapi.app.infrastructure.ai.prompts import (  # noqa: E402
  build_argos_messages,
  build_report_messages,
)
from backend_fastapi.app.settings import settings  # noqa: E402


_SAMPLE_PROFILE = {
  "schemaVersion": 2,
  "diagnosis": "Adenocarcinome pulmonaire (cancer rare, variante)",
  "pathologySummary": "Lesion lobaire superieure droite, 28mm, sans adenopathie evidente.",
  "analyses": [
    {"name": "TDM thoracique", "result": "Nodule spicule 28mm LSD"},
    {"name": "Biomarqueurs", "result": "EGFR non mute, PD-L1 40%"},
  ],
}


def _print_header(title: str) -> None:
  print("\n" + "=" * 70)
  print(title)
  print("=" * 70)


def run_report(service: AiService) -> bool:
  _print_header("generate_report (sync)")
  try:
    out = service.generate_report(
      patient_name="Jean Dupont",
      patient_mrn="PAT-DEMO-001",
      profile=_SAMPLE_PROFILE,
      user_id=1,
    )
  except ApplicationError as exc:
    print(f"FAIL: ApplicationError {exc.status_code} - {exc.detail}")
    return False
  print(json.dumps(out, ensure_ascii=False, indent=2))
  ok = bool(out.get("conclusion")) and bool(out.get("reasoning"))
  print(f"--> report OK: {ok}")
  return ok


def run_argos(service: AiService) -> bool:
  _print_header("argos_respond (sync)")
  try:
    out = service.argos_respond(
      patient_name="Jean Dupont",
      patient_mrn="PAT-DEMO-001",
      context_message="Patient en bilan d'extension.",
      profile=_SAMPLE_PROFILE,
      user_message="Quelles sont les prochaines etapes diagnostiques ?",
      history=[],
      user_id=1,
    )
  except ApplicationError as exc:
    print(f"FAIL: ApplicationError {exc.status_code} - {exc.detail}")
    return False
  print(json.dumps(out, ensure_ascii=False, indent=2))
  ok = bool(out.get("content"))
  print(f"--> argos OK: {ok}")
  return ok


def run_stream(client: OpenAiCompatibleClient) -> bool:
  _print_header("streaming SSE (report + argos)")

  async def _collect(messages) -> str:  # noqa: ANN001
    parts: list[str] = []
    async for chunk in client.stream_sse(messages):
      parts.append(chunk)
    return "".join(parts)

  try:
    report_stream = asyncio.run(
      _collect(
        build_report_messages(
          patient_name="Jean Dupont",
          patient_mrn="PAT-DEMO-001",
          profile=_SAMPLE_PROFILE,
        )
      )
    )
    argos_stream = asyncio.run(
      _collect(
        build_argos_messages(
          patient_name="Jean Dupont",
          patient_mrn="PAT-DEMO-001",
          context_message=None,
          profile=_SAMPLE_PROFILE,
          user_message="Synthese rapide ?",
          history=[],
        )
      )
    )
  except ApplicationError as exc:
    print(f"FAIL: ApplicationError {exc.status_code} - {exc.detail}")
    return False

  ok = "[DONE]" in report_stream and "[DONE]" in argos_stream
  print(f"report stream chars: {len(report_stream)} | argos stream chars: {len(argos_stream)}")
  print(f"--> stream OK: {ok}")
  return ok


def main() -> int:
  parser = argparse.ArgumentParser(description="ARCANE LLM smoke test (openai_compatible).")
  parser.add_argument("--stream", action="store_true", help="Teste aussi les flux SSE.")
  args = parser.parse_args()

  print("Provider :", settings.llm_provider)
  print("Base URL :", settings.llm_base_url)
  print("Model    :", settings.llm_model)
  print("JSON mode:", settings.llm_json_mode)

  if settings.llm_provider != "openai_compatible":
    print(
      "\nERREUR: definir LLM_PROVIDER=openai_compatible (et LLM_BASE_URL) pour tester l'IA reelle.",
    )
    return 2

  client = OpenAiCompatibleClient()
  service = AiService(client)

  results = [run_report(service), run_argos(service)]
  if args.stream:
    results.append(run_stream(client))

  ok = all(results)
  _print_header("RESULTAT")
  print("SUCCESS" if ok else "FAILURE")
  return 0 if ok else 1


if __name__ == "__main__":
  raise SystemExit(main())
