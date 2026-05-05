from __future__ import annotations

import pytest

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.services.ai_service import AiService


class _FakeLlm:
  def __init__(self, text: str):
    self._text = text

  def chat(self, messages):  # noqa: ANN001
    return self._text


def test_generate_report_requires_valid_json_object():
  service = AiService(_FakeLlm("not json"))
  with pytest.raises(ApplicationError) as exc:
    service.generate_report(patient_name="A", patient_mrn=None, profile={})
  assert exc.value.status_code == 502


def test_generate_report_requires_conclusion_and_reasoning():
  service = AiService(_FakeLlm('{"conclusion": "", "reasoning": "x", "sources": []}'))
  with pytest.raises(ApplicationError) as exc:
    service.generate_report(patient_name="A", patient_mrn=None, profile={})
  assert "incomplete" in exc.value.detail.lower()


def test_generate_report_happy_path_trims_and_filters_sources():
  service = AiService(_FakeLlm('{"conclusion":" ok  ","reasoning":" why ","sources":["  a  ","",null,"b"]}'))
  out = service.generate_report(patient_name="A", patient_mrn=None, profile={})
  assert out["conclusion"] == "ok"
  assert out["reasoning"] == "why"
  assert out["sources"] == ["a", "b"]


def test_argos_respond_falls_back_to_plain_text_when_not_json():
  service = AiService(_FakeLlm("bonjour"))
  out = service.argos_respond(
    patient_name=None,
    patient_mrn=None,
    context_message=None,
    profile=None,
    user_message="hi",
    history=[],
  )
  assert out["content"] == "bonjour"
  assert out["sections"] is None


def test_argos_respond_accepts_sections_only_if_dict():
  service = AiService(_FakeLlm('{"content":"c","sections":["not dict"]}'))
  out = service.argos_respond(
    patient_name=None,
    patient_mrn=None,
    context_message=None,
    profile=None,
    user_message="hi",
    history=[],
  )
  assert out["content"] == "c"
  assert out["sections"] is None

