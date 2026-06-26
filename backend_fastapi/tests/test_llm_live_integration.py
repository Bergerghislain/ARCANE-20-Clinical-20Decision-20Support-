"""Test d'integration *live* contre un vrai endpoint OpenAI-compatible (vLLM/Qwen).

Saute par defaut (donc neutre en CI) : il ne s'execute que si la variable
d'environnement `LLM_LIVE_TEST` est definie a une valeur vraie ET que
`LLM_PROVIDER=openai_compatible`. Exemple :

    export LLM_PROVIDER=openai_compatible
    export LLM_BASE_URL=http://127.0.0.1:8001/v1
    export LLM_MODEL=Qwen/Qwen3-4B
    export LLM_LIVE_TEST=1
    python -m pytest backend_fastapi/tests/test_llm_live_integration.py -v

Il valide les deux usages metier (report + argos) sur la *vraie* couche
applicative (`AiService` + `OpenAiCompatibleClient`), exactement comme l'API.
"""
from __future__ import annotations

import os

import pytest

from backend_fastapi.app.application.services.ai_service import AiService
from backend_fastapi.app.infrastructure.ai.llm_resilience import get_llm_circuit_breaker
from backend_fastapi.app.infrastructure.ai.openai_compatible_client import OpenAiCompatibleClient
from backend_fastapi.app.settings import settings


def _live_enabled() -> bool:
  flag = str(os.getenv("LLM_LIVE_TEST", "")).strip().lower()
  return flag in {"1", "true", "yes", "on"} and settings.llm_provider == "openai_compatible"


pytestmark = [
  pytest.mark.integration,
  pytest.mark.skipif(
    not _live_enabled(),
    reason="LLM live test desactive (definir LLM_LIVE_TEST=1 + LLM_PROVIDER=openai_compatible).",
  ),
]


_PROFILE = {
  "schemaVersion": 2,
  "diagnosis": "Adenocarcinome pulmonaire",
  "pathologySummary": "Nodule LSD 28mm, EGFR non mute, PD-L1 40%.",
  "analyses": [{"name": "TDM", "result": "Nodule spicule"}],
}


@pytest.fixture(autouse=True)
def _reset_circuit():
  get_llm_circuit_breaker().reset()
  yield


def test_live_generate_report():
  service = AiService(OpenAiCompatibleClient())
  out = service.generate_report(
    patient_name="Jean Dupont",
    patient_mrn="PAT-LIVE-001",
    profile=_PROFILE,
    user_id=1,
  )
  assert isinstance(out["conclusion"], str) and out["conclusion"].strip()
  assert isinstance(out["reasoning"], str) and out["reasoning"].strip()
  assert isinstance(out["sources"], list)


def test_live_argos_respond():
  service = AiService(OpenAiCompatibleClient())
  out = service.argos_respond(
    patient_name="Jean Dupont",
    patient_mrn="PAT-LIVE-001",
    context_message="Bilan d'extension.",
    profile=_PROFILE,
    user_message="Quelles sont les prochaines etapes diagnostiques ?",
    history=[],
    user_id=1,
  )
  assert isinstance(out["content"], str) and out["content"].strip()
