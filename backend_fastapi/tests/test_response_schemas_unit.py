from __future__ import annotations

import pytest

from backend_fastapi.app.infrastructure.ai.response_schemas import (
  validate_argos_payload,
  validate_report_payload,
)


def test_validate_report_payload_happy_path():
  c, r, s = validate_report_payload(
    {"conclusion": " ok ", "reasoning": " why ", "sources": [" a ", "", "b"]},
  )
  assert c == "ok"
  assert r == "why"
  assert s == ["a", "b"]


def test_validate_report_payload_rejects_incomplete():
  with pytest.raises(ValueError, match="incomplete_report"):
    validate_report_payload({"conclusion": "", "reasoning": "x", "sources": []})


def test_validate_argos_payload_normalizes_sections():
  content, sections = validate_argos_payload(
    {
      "content": " intro ",
      "sections": {
        "clinicalSynthesis": " synth ",
        "hypotheses": [" h1 ", ""],
        "arguments": [" a1 "],
        "nextSteps": [" s1 "],
        "traceability": " trace ",
      },
    },
  )
  assert content == "intro"
  assert sections is not None
  assert sections["hypotheses"] == ["h1"]


def test_validate_argos_payload_rejects_invalid_sections_type():
  with pytest.raises(ValueError, match="invalid_sections"):
    validate_argos_payload({"content": "x", "sections": ["not-a-dict"]})
