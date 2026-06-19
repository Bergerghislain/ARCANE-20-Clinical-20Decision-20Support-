from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from ..errors import ApplicationError
from ..ports.llm_ports import LlmPort
from ...infrastructure.ai.prompts import (
  PROMPT_VERSION,
  build_argos_messages,
  build_report_messages,
)
from ...infrastructure.ai.json_parse import extract_json_object
from ...settings import settings

# Journal d'audit clinique des appels LLM. On ne logge PAS le contenu PHI brut:
# uniquement des metadonnees + une empreinte (hash) pour la tracabilite/reproductibilite.
audit_logger = logging.getLogger("arcane.ai.audit")


def _audit_llm_call(*, operation: str, messages: list[dict[str, Any]], response: str) -> None:
  prompt_chars = sum(len(str(m.get("content") or "")) for m in messages)
  digest = hashlib.sha256(response.encode("utf-8", "ignore")).hexdigest()[:16]
  audit_logger.info(
    "llm_call op=%s provider=%s model=%s prompt_version=%s messages=%d prompt_chars=%d response_chars=%d response_sha256=%s",
    operation,
    settings.llm_provider,
    settings.llm_model,
    PROMPT_VERSION,
    len(messages),
    prompt_chars,
    len(response),
    digest,
  )


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
    _audit_llm_call(operation="report", messages=messages, response=text)
    payload = extract_json_object(text)
    if not payload:
      raise ApplicationError("LLM response is not valid JSON.", 502)
    try:
      conclusion = str(payload.get("conclusion") or "").strip()
      reasoning = str(payload.get("reasoning") or "").strip()
      sources_raw = payload.get("sources") or []
      sources: list[str] = []
      for item in list(sources_raw) if isinstance(sources_raw, list) else []:
        if item is None:
          continue
        value = str(item).strip()
        if value:
          sources.append(value)
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
    _audit_llm_call(operation="argos", messages=messages, response=text)
    payload = extract_json_object(text)
    if not payload:
      # fallback: plain text response
      return {"content": text.strip() or "Je n'ai pas pu générer de réponse.", "sections": None}
    content = str(payload.get("content") or "").strip() or "Voici mon analyse clinique :"
    sections = payload.get("sections")
    if sections is not None and not isinstance(sections, dict):
      sections = None
    return {"content": content, "sections": sections}

