from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from ..application.errors import ApplicationError
from ..application.services.patient_service import PatientService
from ..deps import ClinicianOrAdminUser, get_patient_service


router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("")
def get_patients(
  _user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> list[dict[str, Any]]:
  return patient_service.list_patients()


@router.get("/{patient_id}")
def get_patient(
  patient_id: int,
  _user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.get_patient(patient_id)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("", status_code=status.HTTP_201_CREATED)
def add_patient(
  payload: dict[str, Any],
  user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.add_patient(payload, int(user["id"]))
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.put("/{patient_id}")
def update_patient(
  patient_id: int,
  payload: dict[str, Any],
  _user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.update_patient(patient_id, payload)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_patient_json(
  payload: dict[str, Any],
  _user: ClinicianOrAdminUser,
  patient_service: Annotated[PatientService, Depends(get_patient_service)],
) -> dict[str, Any]:
  try:
    return patient_service.import_patient_json(payload)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

