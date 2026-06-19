"""Validation stricte des réponses JSON LLM (rapport + ARGOS)."""
from __future__ import annotations

from typing import Any


def validate_report_payload(payload: dict[str, Any]) -> tuple[str, str, list[str]]:
  conclusion = str(payload.get("conclusion") or "").strip()
  reasoning = str(payload.get("reasoning") or "").strip()
  if not conclusion or not reasoning:
    raise ValueError("incomplete_report")

  sources_raw = payload.get("sources") or []
  sources: list[str] = []
  if isinstance(sources_raw, list):
    for item in sources_raw:
      if item is None:
        continue
      value = str(item).strip()
      if value:
        sources.append(value)
  return conclusion, reasoning, sources


def validate_argos_payload(payload: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
  content = str(payload.get("content") or "").strip() or "Voici mon analyse clinique :"
  sections = payload.get("sections")
  if sections is None:
    return content, None
  if not isinstance(sections, dict):
    raise ValueError("invalid_sections")

  normalized: dict[str, Any] = {}
  for key in ("clinicalSynthesis", "traceability"):
    if key in sections and sections[key] is not None:
      normalized[key] = str(sections[key]).strip()
  for key in ("hypotheses", "arguments", "nextSteps"):
    if key not in sections or sections[key] is None:
      continue
    raw = sections[key]
    if not isinstance(raw, list):
      raise ValueError("invalid_sections")
    normalized[key] = [str(item).strip() for item in raw if str(item).strip()]

  if not normalized:
    return content, None
  return content, normalized
