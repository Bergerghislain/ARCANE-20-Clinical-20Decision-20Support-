from __future__ import annotations

from backend_fastapi.app.infrastructure.ai import llm_status


def test_probe_llm_status_disabled(monkeypatch):
  monkeypatch.setattr(llm_status.settings, "llm_provider", "disabled")
  out = llm_status.probe_llm_status()
  assert out["ready"] is False
  assert "désactivé" in out["message"].lower()


def test_probe_llm_status_mock_json(monkeypatch):
  monkeypatch.setattr(llm_status.settings, "llm_provider", "mock_json")
  out = llm_status.probe_llm_status()
  assert out["ready"] is True


def test_probe_llm_status_groq_missing_key(monkeypatch):
  monkeypatch.setattr(llm_status.settings, "llm_provider", "openai_compatible")
  monkeypatch.setattr(
    llm_status.settings,
    "llm_base_url",
    "https://api.groq.com/openai/v1",
  )
  monkeypatch.setattr(llm_status.settings, "llm_api_key", None)
  out = llm_status.probe_llm_status()
  assert out["ready"] is False
  assert "LLM_API_KEY" in out["message"]


def test_llm_api_key_effective_ignores_empty_placeholder(monkeypatch):
  monkeypatch.setattr(llm_status.settings, "llm_api_key", "EMPTY")
  assert llm_status.settings.llm_api_key_effective is None
