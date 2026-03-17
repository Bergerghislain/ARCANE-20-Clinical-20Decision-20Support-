from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..application.errors import ApplicationError
from ..application.services.argos_service import ArgosService
from ..deps import ClinicianUser, get_argos_service
from ..schemas import (
  ArgosDiscussionCreateIn,
  ArgosDiscussionOut,
  ArgosMessageCreateIn,
  ArgosMessageOut,
)


router = APIRouter(prefix="/api/argos", tags=["argos"])


@router.post("/discussions", response_model=ArgosDiscussionOut, status_code=status.HTTP_201_CREATED)
def create_discussion(
  payload: ArgosDiscussionCreateIn,
  request: Request,
  user: ClinicianUser,
  argos_service: Annotated[ArgosService, Depends(get_argos_service)],
) -> ArgosDiscussionOut:
  try:
    result = argos_service.create_discussion(
      payload=payload.model_dump(),
      clinician_id=int(user["id"]),
      ip_address=request.client.host if request.client else None,
      user_agent=request.headers.get("user-agent"),
    )
    return ArgosDiscussionOut(**result)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.get("/discussions", response_model=list[ArgosDiscussionOut])
def list_discussions(
  user: ClinicianUser,
  argos_service: Annotated[ArgosService, Depends(get_argos_service)],
  patient_id: int | None = None,
) -> list[ArgosDiscussionOut]:
  try:
    rows = argos_service.list_discussions(
      clinician_id=int(user["id"]),
      patient_id=patient_id,
    )
    return [ArgosDiscussionOut(**row) for row in rows]
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.get("/discussions/{discussion_id}", response_model=ArgosDiscussionOut)
def get_discussion(
  discussion_id: int,
  user: ClinicianUser,
  argos_service: Annotated[ArgosService, Depends(get_argos_service)],
) -> ArgosDiscussionOut:
  try:
    result = argos_service.get_discussion(discussion_id=discussion_id, clinician_id=int(user["id"]))
    return ArgosDiscussionOut(**result)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.get("/discussions/{discussion_id}/messages", response_model=list[ArgosMessageOut])
def list_messages(
  discussion_id: int,
  user: ClinicianUser,
  argos_service: Annotated[ArgosService, Depends(get_argos_service)],
) -> list[ArgosMessageOut]:
  try:
    rows = argos_service.list_messages(discussion_id=discussion_id, clinician_id=int(user["id"]))
    return [ArgosMessageOut(**row) for row in rows]
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post(
  "/discussions/{discussion_id}/messages",
  response_model=ArgosMessageOut,
  status_code=status.HTTP_201_CREATED,
)
def add_message(
  discussion_id: int,
  payload: ArgosMessageCreateIn,
  request: Request,
  user: ClinicianUser,
  argos_service: Annotated[ArgosService, Depends(get_argos_service)],
) -> ArgosMessageOut:
  try:
    result = argos_service.add_message(
      discussion_id=discussion_id,
      payload=payload.model_dump(),
      clinician_id=int(user["id"]),
      ip_address=request.client.host if request.client else None,
      user_agent=request.headers.get("user-agent"),
    )
    return ArgosMessageOut(**result)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

