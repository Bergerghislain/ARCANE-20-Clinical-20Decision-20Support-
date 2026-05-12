from __future__ import annotations

import json

from backend_fastapi.app.infrastructure.ai.mock_llm_client import MockJsonLlmClient
from backend_fastapi.app.infrastructure.ai.prompts import build_argos_messages, build_report_messages


def test_mock_json_report_shape():
  m = MockJsonLlmClient()
  msgs = build_report_messages(patient_name="P", patient_mrn="1", profile={"schemaVersion": 1})
  raw = m.chat(msgs)
  data = json.loads(raw)
  assert "conclusion" in data and "reasoning" in data and "sources" in data


def test_mock_json_argos_shape():
  m = MockJsonLlmClient()
  msgs = build_argos_messages(
    patient_name="P",
    patient_mrn=None,
    context_message=None,
    profile=None,
    user_message="hello",
    history=[],
  )
  raw = m.chat(msgs)
  data = json.loads(raw)
  assert "content" in data
