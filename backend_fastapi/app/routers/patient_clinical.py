"""Endpoints CRUD du dossier clinique par section."""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from ..application.errors import ApplicationError
from ..application.services.patient_clinical_service import PatientClinicalService
from ..deps import ClinicianOrAdminUser, get_patient_clinical_service
from ..schemas import (
  BiologicalSpecimenIn,
  BiomarkerWriteIn,
  ImagingStudyWriteIn,
  MeasureIn,
  MedicationIn,
  RadiotherapyWriteIn,
  SurgeryWriteIn,
  TnmEventWriteIn,
)

router = APIRouter(prefix="/api/patients", tags=["patient-clinical"])


def _handle(error: ApplicationError) -> None:
  raise HTTPException(status_code=error.status_code, detail=error.detail)


def _user_ids(user: dict[str, Any]) -> tuple[int, str]:
  return int(user["id"]), str(user.get("role") or "")


# --- Measures ---
@router.post("/{patient_id}/clinical/measures", status_code=status.HTTP_201_CREATED)
def create_measure(
  patient_id: int,
  payload: MeasureIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_measure(
      patient_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put("/{patient_id}/clinical/measures/{measure_id}")
def update_measure(
  patient_id: int,
  measure_id: int,
  payload: MeasureIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_measure(
      patient_id,
      measure_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete("/{patient_id}/clinical/measures/{measure_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_measure(
  patient_id: int,
  measure_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_measure(
      patient_id,
      measure_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- Medications ---
@router.post("/{patient_id}/clinical/medications", status_code=status.HTTP_201_CREATED)
def create_medication(
  patient_id: int,
  payload: MedicationIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_medication(
      patient_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put("/{patient_id}/clinical/medications/{medication_id}")
def update_medication(
  patient_id: int,
  medication_id: int,
  payload: MedicationIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_medication(
      patient_id,
      medication_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete(
  "/{patient_id}/clinical/medications/{medication_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
def delete_medication(
  patient_id: int,
  medication_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_medication(
      patient_id,
      medication_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- Surgeries ---
@router.post("/{patient_id}/clinical/surgeries", status_code=status.HTTP_201_CREATED)
def create_surgery(
  patient_id: int,
  payload: SurgeryWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_surgery(
      patient_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put("/{patient_id}/clinical/surgeries/{surgery_id}")
def update_surgery(
  patient_id: int,
  surgery_id: int,
  payload: SurgeryWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_surgery(
      patient_id,
      surgery_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete("/{patient_id}/clinical/surgeries/{surgery_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_surgery(
  patient_id: int,
  surgery_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_surgery(
      patient_id,
      surgery_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- Radiotherapy ---
@router.post("/{patient_id}/clinical/radiotherapies", status_code=status.HTTP_201_CREATED)
def create_radiotherapy(
  patient_id: int,
  payload: RadiotherapyWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_radiotherapy(
      patient_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put("/{patient_id}/clinical/radiotherapies/{radiotherapy_id}")
def update_radiotherapy(
  patient_id: int,
  radiotherapy_id: int,
  payload: RadiotherapyWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_radiotherapy(
      patient_id,
      radiotherapy_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete(
  "/{patient_id}/clinical/radiotherapies/{radiotherapy_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
def delete_radiotherapy(
  patient_id: int,
  radiotherapy_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_radiotherapy(
      patient_id,
      radiotherapy_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- Imaging ---
@router.post("/{patient_id}/clinical/imaging-studies", status_code=status.HTTP_201_CREATED)
def create_imaging_study(
  patient_id: int,
  payload: ImagingStudyWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_imaging_study(
      patient_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put("/{patient_id}/clinical/imaging-studies/{imaging_id}")
def update_imaging_study(
  patient_id: int,
  imaging_id: int,
  payload: ImagingStudyWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_imaging_study(
      patient_id,
      imaging_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete(
  "/{patient_id}/clinical/imaging-studies/{imaging_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
def delete_imaging_study(
  patient_id: int,
  imaging_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_imaging_study(
      patient_id,
      imaging_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- TNM (sous cancer primitif) ---
@router.post(
  "/{patient_id}/clinical/primary-cancers/{primary_cancer_id}/tnm-events",
  status_code=status.HTTP_201_CREATED,
)
def create_tnm_event(
  patient_id: int,
  primary_cancer_id: int,
  payload: TnmEventWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_tnm_event(
      patient_id,
      primary_cancer_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put(
  "/{patient_id}/clinical/primary-cancers/{primary_cancer_id}/tnm-events/{tnm_id}",
)
def update_tnm_event(
  patient_id: int,
  primary_cancer_id: int,
  tnm_id: int,
  payload: TnmEventWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_tnm_event(
      patient_id,
      primary_cancer_id,
      tnm_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete(
  "/{patient_id}/clinical/primary-cancers/{primary_cancer_id}/tnm-events/{tnm_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
def delete_tnm_event(
  patient_id: int,
  primary_cancer_id: int,
  tnm_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_tnm_event(
      patient_id,
      primary_cancer_id,
      tnm_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- Specimens ---
@router.post("/{patient_id}/clinical/specimens", status_code=status.HTTP_201_CREATED)
def create_specimen(
  patient_id: int,
  payload: BiologicalSpecimenIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_specimen(
      patient_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put("/{patient_id}/clinical/specimens/{specimen_id}")
def update_specimen(
  patient_id: int,
  specimen_id: int,
  payload: BiologicalSpecimenIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_specimen(
      patient_id,
      specimen_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete(
  "/{patient_id}/clinical/specimens/{specimen_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
def delete_specimen(
  patient_id: int,
  specimen_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_specimen(
      patient_id,
      specimen_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


# --- Biomarkers ---
@router.post(
  "/{patient_id}/clinical/specimens/{specimen_id}/biomarkers",
  status_code=status.HTTP_201_CREATED,
)
def create_biomarker(
  patient_id: int,
  specimen_id: int,
  payload: BiomarkerWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.create_biomarker(
      patient_id,
      specimen_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.put(
  "/{patient_id}/clinical/specimens/{specimen_id}/biomarkers/{biomarker_id}",
)
def update_biomarker(
  patient_id: int,
  specimen_id: int,
  biomarker_id: int,
  payload: BiomarkerWriteIn,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> dict[str, Any]:
  requester_id, requester_role = _user_ids(user)
  try:
    return service.update_biomarker(
      patient_id,
      specimen_id,
      biomarker_id,
      payload.model_dump(),
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)


@router.delete(
  "/{patient_id}/clinical/specimens/{specimen_id}/biomarkers/{biomarker_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
def delete_biomarker(
  patient_id: int,
  specimen_id: int,
  biomarker_id: int,
  user: ClinicianOrAdminUser,
  service: Annotated[PatientClinicalService, Depends(get_patient_clinical_service)],
) -> None:
  requester_id, requester_role = _user_ids(user)
  try:
    service.delete_biomarker(
      patient_id,
      specimen_id,
      biomarker_id,
      requester_id=requester_id,
      requester_role=requester_role,
    )
  except ApplicationError as error:
    _handle(error)
