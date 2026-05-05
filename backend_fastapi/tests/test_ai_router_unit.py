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

