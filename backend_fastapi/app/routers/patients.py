from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..application.errors import ApplicationError
from ..application.services.patient_service import PatientService
from ..deps import AdminUser, ClinicianOrAdminUser, get_patient_service
from ..schemas import PatientProfileIn, PatientProfileOut


router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("")
def get_patients(
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
  limit: Annotated[int | None, Query(ge=1, le=200)] = None,
  offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict[str, Any]]:
  return patient_service.list_patients(
    requester_id=int(user["id"]),
    requester_role=str(user.get("role") or ""),
    limit=limit,
    offset=offset,
  )


@router.get("/{patient_id}")
def get_patient(
  patient_id: int,
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.get_patient(
      patient_id,
      requester_id=int(user["id"]),
      requester_role=str(user.get("role") or ""),
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("", status_code=status.HTTP_201_CREATED)
def add_patient(
  payload: dict[str, Any],
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.add_patient(
      payload,
      int(user["id"]),
      str(user.get("role") or ""),
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.put("/{patient_id}")
def update_patient(
  patient_id: int,
  payload: dict[str, Any],
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.update_patient(
      patient_id,
      payload,
      requester_id=int(user["id"]),
      requester_role=str(user.get("role") or ""),
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


class PatientAssignIn(BaseModel):
  clinician_id: int = Field(ge=1)


@router.post("/{patient_id}/assign")
def assign_patient(
  patient_id: int,
  payload: PatientAssignIn,
  admin: AdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.reassign_patient(
      patient_id=patient_id,
      new_clinician_id=int(payload.clinician_id),
      requester_id=int(admin["id"]),
      requester_role=str(admin.get("role") or ""),
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_patient_json(
  payload: dict[str, Any],
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.import_patient_json(
      payload,
      requester_id=int(user["id"]),
      requester_role=str(user.get("role") or ""),
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.get("/{patient_id}/profile", response_model=PatientProfileOut)
def get_patient_profile(
  patient_id: int,
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> PatientProfileOut:
  try:
    payload = patient_service.get_patient_profile(
      patient_id,
      requester_id=int(user["id"]),
      requester_role=str(user.get("role") or ""),
    )
    return PatientProfileOut(**payload)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.put("/{patient_id}/profile", response_model=PatientProfileOut)
def save_patient_profile(
  patient_id: int,
  payload: PatientProfileIn,
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> PatientProfileOut:
  try:
    saved = patient_service.save_patient_profile(
      patient_id,
      payload.model_dump(),
      requester_id=int(user["id"]),
      requester_role=str(user.get("role") or ""),
    )
    return PatientProfileOut(**saved)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

