from __future__ import annotations

from fastapi.testclient import TestClient

from backend_fastapi.app.main import app


def test_stream_report_returns_503_when_llm_provider_disabled():
  # On valide la branche "provider disabled" sans appeler un vrai LLM.
  with TestClient(app) as client:
    # Bypass auth: on override la dépendance get_current_user utilisée par ClinicianOrAdminUser.
    from backend_fastapi.app import deps
    from backend_fastapi.app.settings import settings

    app.dependency_overrides[deps.get_current_user] = lambda: {"id": 1, "role": "admin"}
    try:
      old = settings.llm_provider
      settings.llm_provider = "disabled"
      resp = client.post(
        "/api/ai/report/stream",
        json={
          "patient_name": "A",
          "patient_mrn": None,
          "profile": {"patientId": "1", "schemaVersion": 1, "diagnosis": "x", "pathologySummary": "y", "analyses": [], "report": {"conclusion": "c", "reasoning": "r", "sources": ["s"]}},
        },
      )
      assert resp.status_code == 503
      assert resp.json()["detail"] == "LLM provider is disabled."
    finally:
      settings.llm_provider = old
      app.dependency_overrides.clear()


def test_stream_argos_returns_503_when_llm_provider_disabled():
  with TestClient(app) as client:
    from backend_fastapi.app import deps
    from backend_fastapi.app.settings import settings

    app.dependency_overrides[deps.get_current_user] = lambda: {"id": 1, "role": "admin"}
    try:
      old = settings.llm_provider
      settings.llm_provider = "disabled"
      resp = client.post(
        "/api/ai/argos/respond/stream",
        json={"user_message": "Bonjour", "history": []},
      )
      assert resp.status_code == 503
    finally:
      settings.llm_provider = old
      app.dependency_overrides.clear()


def test_stream_report_sse_override_use_case_bypasses_disabled_settings():
  """Le cas d'usage est injecte: pas de dependance au flag settings pour le flux."""
  from backend_fastapi.app import deps
  from backend_fastapi.app.application.use_cases.stream_llm_sse import StreamLlmSseUseCase
  from backend_fastapi.app.infrastructure.ai.mock_llm_client import MockJsonLlmClient
  from backend_fastapi.app.settings import settings

  with TestClient(app) as client:
    app.dependency_overrides[deps.get_current_user] = lambda: {"id": 1, "role": "admin"}
    app.dependency_overrides[deps.get_stream_llm_sse_use_case] = lambda: StreamLlmSseUseCase(
      MockJsonLlmClient(),
    )
    try:
      old = settings.llm_provider
      settings.llm_provider = "disabled"
      resp = client.post(
        "/api/ai/report/stream",
        json={
          "patient_name": "A",
          "patient_mrn": None,
          "profile": {
            "patientId": "1",
            "schemaVersion": 1,
            "diagnosis": "x",
            "pathologySummary": "y",
            "analyses": [],
            "report": {"conclusion": "c", "reasoning": "r", "sources": ["s"]},
          },
        },
      )
      assert resp.status_code == 200
      assert "[DONE]" in resp.text
    finally:
      settings.llm_provider = old
      app.dependency_overrides.clear()


def test_stream_report_mock_json_returns_sse_chunks():
  with TestClient(app) as client:
    from backend_fastapi.app import deps
    from backend_fastapi.app.settings import settings

    app.dependency_overrides[deps.get_current_user] = lambda: {"id": 1, "role": "admin"}
    try:
      old = settings.llm_provider
      settings.llm_provider = "mock_json"
      resp = client.post(
        "/api/ai/report/stream",
        json={
          "patient_name": "A",
          "patient_mrn": None,
          "profile": {
            "patientId": "1",
            "schemaVersion": 1,
            "diagnosis": "x",
            "pathologySummary": "y",
            "analyses": [],
            "report": {"conclusion": "c", "reasoning": "r", "sources": ["s"]},
          },
        },
      )
      assert resp.status_code == 200
      assert "[DONE]" in resp.text
      assert "choices" in resp.text
    finally:
      settings.llm_provider = old
      app.dependency_overrides.clear()

