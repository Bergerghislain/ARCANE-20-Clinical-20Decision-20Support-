from __future__ import annotations

import json
from typing import Any

from ..errors import ApplicationError
from ..ports.llm_ports import LlmPort
from ...infrastructure.ai.prompts import (
  build_argos_messages,
  build_report_messages,
)
from ...infrastructure.ai.json_parse import extract_json_object


class AiService:
  def __init__(self, llm: LlmPort):
    self._llm = llm

  def generate_report(
    self,
    *,
    patient_name: str,
    patient_mrn: str | None,
    profile: dict[str, Any],
  ) -> dict[str, Any]:
    messages = build_report_messages(
      patient_name=patient_name,
      patient_mrn=patient_mrn,
      profile=profile,
    )
    text = self._llm.chat(messages)
    payload = extract_json_object(text)
    if not payload:
      raise ApplicationError("LLM response is not valid JSON.", 502)
    try:
      conclusion = str(payload.get("conclusion") or "").strip()
      reasoning = str(payload.get("reasoning") or "").strip()
      sources_raw = payload.get("sources") or []
      sources = [str(s).strip() for s in list(sources_raw) if str(s).strip()]
    except Exception as exc:
      raise ApplicationError("LLM response JSON has unexpected shape.", 502) from exc
    if not conclusion or not reasoning:
      raise ApplicationError("LLM returned an incomplete report.", 502)
    return {"conclusion": conclusion, "reasoning": reasoning, "sources": sources}

  def argos_respond(
    self,
    *,
    patient_name: str | None,
    patient_mrn: str | None,
    context_message: str | None,
    profile: dict[str, Any] | None,
    user_message: str,
    history: list[dict[str, Any]],
  ) -> dict[str, Any]:
    messages = build_argos_messages(
      patient_name=patient_name,
      patient_mrn=patient_mrn,
      context_message=context_message,
      profile=profile,
      user_message=user_message,
      history=history,
    )
    text = self._llm.chat(messages)
    payload = extract_json_object(text)
    if not payload:
      # fallback: plain text response
      return {"content": text.strip() or "Je n'ai pas pu générer de réponse.", "sections": None}
    content = str(payload.get("content") or "").strip() or "Voici mon analyse clinique :"
    sections = payload.get("sections")
    if sections is not None and not isinstance(sections, dict):
      sections = None
    return {"content": content, "sections": sections}

