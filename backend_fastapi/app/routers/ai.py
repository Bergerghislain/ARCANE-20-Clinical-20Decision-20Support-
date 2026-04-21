from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse
import httpx

from ..application.errors import ApplicationError
from ..deps import ClinicianOrAdminUser, get_ai_service
from ..schemas import PatientProfileIn
from ..application.services.ai_service import AiService
from ..infrastructure.ai.prompts import build_argos_messages, build_report_messages
from ..settings import settings


router = APIRouter(prefix="/api/ai", tags=["ai"])


class ReportGenerateIn(BaseModel):
  patient_name: str = Field(..., min_length=1)
  patient_mrn: str | None = None
  profile: PatientProfileIn


class ReportGenerateOut(BaseModel):
  conclusion: str
  reasoning: str
  sources: list[str]


@router.post("/report", response_model=ReportGenerateOut)
def generate_report(
  payload: ReportGenerateIn,
  _user: ClinicianOrAdminUser,
  ai: AiService = Depends(get_ai_service),
) -> ReportGenerateOut:
  try:
    result = ai.generate_report(
      patient_name=payload.patient_name,
      patient_mrn=payload.patient_mrn,
      profile=payload.profile.model_dump(),
    )
    return ReportGenerateOut(**result)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("/report/stream", status_code=status.HTTP_200_OK)
async def stream_report(
  payload: ReportGenerateIn,
  _user: ClinicianOrAdminUser,
  _request: Request,
):
  """Streaming SSE proxy vers le LLM (raisonnement visible en temps réel).

  Retourne un flux `text/event-stream` de type OpenAI-compatible :
  - `data: {json_chunk}\n\n` jusqu'à `data: [DONE]\n\n`
  """
  if settings.llm_provider != "openai_compatible":
    raise HTTPException(status_code=503, detail="LLM provider is disabled.")

  messages = build_report_messages(
    patient_name=payload.patient_name,
    patient_mrn=payload.patient_mrn,
    profile=payload.profile.model_dump(),
  )

  base = settings.llm_base_url.rstrip("/")
  url = f"{base}/chat/completions"
  headers: dict[str, str] = {"Content-Type": "application/json"}
  if settings.llm_api_key:
    headers["Authorization"] = f"Bearer {settings.llm_api_key}"

  req_payload: dict[str, Any] = {
    "model": settings.llm_model,
    "messages": messages,
    "temperature": settings.llm_temperature,
    "top_p": settings.llm_top_p,
    "max_tokens": settings.llm_max_tokens,
    "stream": True,
    # On garde JSON strict, mais en streaming : le client accumule et parse en fin.
    "response_format": {"type": "json_object"},
  }

  async def _event_stream():
    try:
      async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        async with client.stream("POST", url, headers=headers, json=req_payload) as resp:
          if resp.status_code >= 400:
            detail = f"LLM request failed ({resp.status_code})."
            yield f"data: {detail}\n\n"
            yield "data: [DONE]\n\n"
            return
          async for chunk in resp.aiter_text():
            if chunk:
              # vLLM renvoie déjà du SSE "data: ...\n\n"
              yield chunk
    except httpx.RequestError:
      yield "data: LLM endpoint is unreachable.\n\n"
      yield "data: [DONE]\n\n"

  return StreamingResponse(_event_stream(), media_type="text/event-stream")


class ArgosRespondIn(BaseModel):
  patient_name: str | None = None
  patient_mrn: str | None = None
  context_message: str | None = None
  profile: PatientProfileIn | None = None
  user_message: str = Field(..., min_length=1)
  history: list[dict[str, Any]] = Field(default_factory=list)


class ArgosRespondOut(BaseModel):
  content: str
  sections: dict[str, Any] | None = None


@router.post("/argos/respond", response_model=ArgosRespondOut, status_code=status.HTTP_200_OK)
def argos_respond(
  payload: ArgosRespondIn,
  _user: ClinicianOrAdminUser,
  ai: AiService = Depends(get_ai_service),
) -> ArgosRespondOut:
  try:
    result = ai.argos_respond(
      patient_name=payload.patient_name,
      patient_mrn=payload.patient_mrn,
      context_message=payload.context_message,
      profile=payload.profile.model_dump() if payload.profile else None,
      user_message=payload.user_message,
      history=payload.history,
    )
    return ArgosRespondOut(**result)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("/argos/respond/stream", status_code=status.HTTP_200_OK)
async def stream_argos_respond(
  payload: ArgosRespondIn,
  _user: ClinicianOrAdminUser,
  _request: Request,
):
  """Streaming SSE proxy vers le LLM pour ARGOS (réponse visible en temps réel)."""
  if settings.llm_provider != "openai_compatible":
    raise HTTPException(status_code=503, detail="LLM provider is disabled.")

  messages = build_argos_messages(
    patient_name=payload.patient_name,
    patient_mrn=payload.patient_mrn,
    context_message=payload.context_message,
    profile=payload.profile.model_dump() if payload.profile else None,
    user_message=payload.user_message,
    history=payload.history,
  )

  base = settings.llm_base_url.rstrip("/")
  url = f"{base}/chat/completions"
  headers: dict[str, str] = {"Content-Type": "application/json"}
  if settings.llm_api_key:
    headers["Authorization"] = f"Bearer {settings.llm_api_key}"

  req_payload: dict[str, Any] = {
    "model": settings.llm_model,
    "messages": messages,
    "temperature": settings.llm_temperature,
    "top_p": settings.llm_top_p,
    "max_tokens": settings.llm_max_tokens,
    "stream": True,
    "response_format": {"type": "json_object"},
  }

  async def _event_stream():
    try:
      async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        async with client.stream("POST", url, headers=headers, json=req_payload) as resp:
          if resp.status_code >= 400:
            detail = f"LLM request failed ({resp.status_code})."
            yield f"data: {detail}\n\n"
            yield "data: [DONE]\n\n"
            return
          async for chunk in resp.aiter_text():
            if chunk:
              yield chunk
    except httpx.RequestError:
      yield "data: LLM endpoint is unreachable.\n\n"
      yield "data: [DONE]\n\n"

  return StreamingResponse(_event_stream(), media_type="text/event-stream")

