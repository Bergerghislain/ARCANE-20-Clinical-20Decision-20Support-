from __future__ import annotations

import time
from typing import Any

from ...infrastructure.ai.ai_audit import log_ai_request, log_ai_response
from ...infrastructure.ai.json_parse import extract_json_object
from ...infrastructure.ai.prompts import (
  build_argos_messages,
  build_report_messages,
)
from ...infrastructure.ai.response_schemas import validate_argos_payload, validate_report_payload
from ..errors import ApplicationError
from ..ports.llm_ports import LlmPort


class AiService:
  def __init__(self, llm: LlmPort):
    self._llm = llm

  def generate_report(
    self,
    *,
    patient_name: str,
    patient_mrn: str | None,
    profile: dict[str, Any],
    user_id: int | None = None,
  ) -> dict[str, Any]:
    log_ai_request(
      kind="report",
      user_id=user_id,
      meta={
        "patient_name": patient_name,
        "patient_mrn": patient_mrn,
        "profile": profile,
      },
    )
    messages = build_report_messages(
      patient_name=patient_name,
      patient_mrn=patient_mrn,
      profile=profile,
    )
    started = time.perf_counter()
    try:
      text = self._llm.chat(messages)
      payload = extract_json_object(text)
      if not payload:
        raise ApplicationError("LLM response is not valid JSON.", 502)
      conclusion, reasoning, sources = validate_report_payload(payload)
    except ApplicationError:
      log_ai_response(kind="report", user_id=user_id, success=False, detail="application_error")
      raise
    except ValueError as exc:
      log_ai_response(kind="report", user_id=user_id, success=False, detail=str(exc))
      if str(exc) == "incomplete_report":
        raise ApplicationError("LLM returned an incomplete report.", 502) from exc
      raise ApplicationError("LLM response JSON has unexpected shape.", 502) from exc
    except Exception as exc:
      log_ai_response(kind="report", user_id=user_id, success=False, detail="llm_error")
      raise ApplicationError("LLM request failed.", 502) from exc

    log_ai_response(
      kind="report",
      user_id=user_id,
      success=True,
      response_chars=len(conclusion) + len(reasoning),
      latency_ms=(time.perf_counter() - started) * 1000,
    )
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
    user_id: int | None = None,
  ) -> dict[str, Any]:
    log_ai_request(
      kind="argos",
      user_id=user_id,
      meta={
        "patient_name": patient_name,
        "patient_mrn": patient_mrn,
        "context_message": context_message,
        "profile": profile,
        "user_message": user_message,
        "chat_history": history,
      },
    )
    messages = build_argos_messages(
      patient_name=patient_name,
      patient_mrn=patient_mrn,
      context_message=context_message,
      profile=profile,
      user_message=user_message,
      history=history,
    )
    started = time.perf_counter()
    try:
      text = self._llm.chat(messages)
      payload = extract_json_object(text)
      if not payload:
        fallback = text.strip() or "Je n'ai pas pu générer de réponse."
        log_ai_response(
          kind="argos",
          user_id=user_id,
          success=True,
          response_chars=len(fallback),
          latency_ms=(time.perf_counter() - started) * 1000,
        )
        return {"content": fallback, "sections": None}
      content, sections = validate_argos_payload(payload)
    except ValueError as exc:
      log_ai_response(kind="argos", user_id=user_id, success=False, detail=str(exc))
      raise ApplicationError("LLM response JSON has unexpected shape.", 502) from exc
    except ApplicationError:
      log_ai_response(kind="argos", user_id=user_id, success=False, detail="application_error")
      raise
    except Exception as exc:
      log_ai_response(kind="argos", user_id=user_id, success=False, detail="llm_error")
      raise ApplicationError("LLM request failed.", 502) from exc

    log_ai_response(
      kind="argos",
      user_id=user_id,
      success=True,
      response_chars=len(content),
      latency_ms=(time.perf_counter() - started) * 1000,
    )
    return {"content": content, "sections": sections}
