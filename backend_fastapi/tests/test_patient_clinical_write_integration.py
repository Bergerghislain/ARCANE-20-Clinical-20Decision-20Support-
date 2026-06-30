from __future__ import annotations

import pytest

from backend_fastapi.app.db import execute, fetch_one
from backend_fastapi.app.infrastructure.repositories.patient_clinical_write import (
  SqlPatientClinicalWriteRepository,
)
from backend_fastapi.tests.integration_helpers import patient_id_by_ipp


@pytest.mark.integration
def test_patient_clinical_write_measure_crud_lifecycle():
  repo = SqlPatientClinicalWriteRepository()
  patient_id = patient_id_by_ipp("PAT001")

  created = repo.create_measure(
    patient_id,
    {
      "measureType": "WEIGHT",
      "measureUnit": "kg",
      "measureValue": 72.5,
      "measureDateYear": 2024,
      "measureDateMonth": 6,
    },
  )
  assert created["id"] > 0
  measure_id = int(created["id"])

  updated = repo.update_measure(
    patient_id,
    measure_id,
    {
      "measureType": "WEIGHT",
      "measureUnit": "kg",
      "measureValue": 71.0,
      "measureDateYear": 2024,
      "measureDateMonth": 7,
    },
  )
  assert updated is not None
  assert float(updated.get("measureValue") or 0) == 71.0

  assert repo.delete_measure(patient_id, measure_id) is True
  assert repo.update_measure(
    patient_id,
    measure_id,
    {"measureType": "WEIGHT", "measureUnit": "kg"},
  ) is None


@pytest.mark.integration
def test_patient_clinical_write_medication_and_surgery():
  repo = SqlPatientClinicalWriteRepository()
  patient_id = patient_id_by_ipp("PAT001")

  med = repo.create_medication(
    patient_id,
    {
      "medicationName": "TestMed",
      "dosage": "100mg",
      "frequency": "daily",
      "startDateYear": 2024,
      "startDateMonth": 1,
    },
  )
  med_id = int(med["id"])
  assert med["medicationName"] == "TestMed"

  cancer_row = fetch_one(
    """
    INSERT INTO primary_cancers (
      patient_id, topography_code, cancer_diagnosis_date_year, cancer_diagnosis_date_month
    ) VALUES (%s, %s, %s, %s) RETURNING id
    """,
    (patient_id, "C50", 2023, 5),
  )
  cancer_id = int(cancer_row["id"])

  surgery = repo.create_surgery(
    patient_id,
    {
      "surgeryType": "Biopsie",
      "primaryCancerId": cancer_id,
      "surgeryDateYear": 2024,
      "surgeryDateMonth": 2,
    },
  )
  surgery_id = int(surgery["id"])
  assert surgery.get("primaryCancerId") == cancer_id

  with pytest.raises(ValueError, match="primary_cancer_not_found"):
    repo.create_surgery(patient_id, {"surgeryType": "X", "primaryCancerId": 999999})

  repo.delete_surgery(patient_id, surgery_id)
  repo.delete_medication(patient_id, med_id)
  execute("DELETE FROM primary_cancers WHERE id = %s", (cancer_id,))


@pytest.mark.integration
def test_patient_clinical_write_specimen_and_biomarker():
  repo = SqlPatientClinicalWriteRepository()
  patient_id = patient_id_by_ipp("PAT002")
  suffix = patient_id

  specimen = repo.create_specimen(
    patient_id,
    {
      "specimenIdentifier": f"SPEC-TEST-{suffix}",
      "specimenCollectDateYear": 2024,
      "specimenCollectDateMonth": 3,
      "specimenType": "BIOPSY",
      "specimenNature": "TUMORAL",
    },
  )
  specimen_id = int(specimen["id"])

  biomarker = repo.create_biomarker(
    patient_id,
    specimen_id,
    {
      "biomarkerName": "PD-L1",
      "biomarkerValue": "45",
      "biomarkerUnit": "%",
      "testDateYear": 2024,
      "testDateMonth": 3,
    },
  )
  bio_id = int(biomarker["id"])
  assert biomarker["biomarkerName"] == "PD-L1"

  updated = repo.update_biomarker(
    patient_id,
    specimen_id,
    bio_id,
    {"biomarkerName": "PD-L1", "biomarkerValue": "50", "biomarkerUnit": "%"},
  )
  assert updated is not None

  with pytest.raises(ValueError, match="specimen_not_found"):
    repo.create_biomarker(patient_id, 999999, {"biomarkerName": "X"})

  repo.delete_biomarker(patient_id, specimen_id, bio_id)
  repo.delete_specimen(patient_id, specimen_id)


@pytest.mark.integration
def test_patient_clinical_write_radiotherapy_imaging_tnm():
  repo = SqlPatientClinicalWriteRepository()
  patient_id = patient_id_by_ipp("PAT002")

  cancer_row = fetch_one(
    """
    INSERT INTO primary_cancers (
      patient_id, topography_code, cancer_diagnosis_date_year, cancer_diagnosis_date_month
    ) VALUES (%s, %s, %s, %s) RETURNING id
    """,
    (patient_id, "C34", 2022, 1),
  )
  cancer_id = int(cancer_row["id"])

  radio = repo.create_radiotherapy(
    patient_id,
    {"modality": "EBRT", "primaryCancerId": cancer_id, "totalDose": 50, "doseUnit": "Gy"},
  )
  radio_id = int(radio["id"])

  imaging = repo.create_imaging_study(
    patient_id,
    {"studyType": "MRI", "primaryCancerId": cancer_id, "studyDateYear": 2024, "bodyPart": "thorax"},
  )
  imaging_id = int(imaging["id"])

  tnm = repo.create_tnm_event(
    patient_id,
    cancer_id,
    {"tnmVersion": "8", "tCategory": "T2", "nCategory": "N0", "mCategory": "M0"},
  )
  tnm_id = int(tnm["id"])

  repo.delete_tnm_event(patient_id, cancer_id, tnm_id)
  repo.delete_imaging_study(patient_id, imaging_id)
  repo.delete_radiotherapy(patient_id, radio_id)
  execute("DELETE FROM primary_cancers WHERE id = %s", (cancer_id,))
