from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..application.errors import ApplicationError
from ..deps import ClinicianOrAdminUser, get_ai_service
from ..schemas import PatientProfileIn
from ..application.services.ai_service import AiService


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

