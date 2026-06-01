"""Lecture du dossier clinique structure (SQL -> JSON clinicalData)."""
from __future__ import annotations

import json
from collections import defaultdict
from decimal import Decimal
from typing import Any

from ...db import fetch_all, fetch_one


def _json_value(value: Any) -> Any:
  if isinstance(value, Decimal):
    return float(value)
  return value


def _month_year_label(year: Any, month: Any) -> str:
  if year is None:
    return "—"
  y = int(year)
  if month is None:
    return str(y)
  return f"{int(month):02d}/{y}"


def find_clinical_bundle(patient_id: int) -> dict[str, Any] | None:
  patient = fetch_one(
    """
    SELECT
      ipp,
      birth_date_year,
      birth_date_month,
      sex,
      death_date_year,
      death_date_month,
      last_visit_date_year,
      last_visit_date_month,
      last_news_date_year,
      last_news_date_month
    FROM patients
    WHERE id_patient = %s
  """,
    (patient_id,),
  )
  if not patient:
    return None

  cancers = fetch_all(
    """
    SELECT *
    FROM primary_cancers
    WHERE patient_id = %s
    ORDER BY cancer_order NULLS LAST, id
    """,
    (patient_id,),
  )
  cancer_ids = [int(row["id"]) for row in cancers]

  grades_by_cancer = _group_by_foreign_key(
    fetch_all(
      """
      SELECT *
      FROM primary_cancer_grades
      WHERE primary_cancer_id = ANY(%s)
      ORDER BY id
      """,
      (cancer_ids,),
    )
    if cancer_ids
    else [],
    "primary_cancer_id",
  )
  stages_by_cancer = _group_by_foreign_key(
    fetch_all(
      """
      SELECT *
      FROM primary_cancer_stages
      WHERE primary_cancer_id = ANY(%s)
      ORDER BY id
      """,
      (cancer_ids,),
    )
    if cancer_ids
    else [],
    "primary_cancer_id",
  )
  patho_by_cancer = _group_by_foreign_key(
    fetch_all(
      """
      SELECT *
      FROM tumor_patho_events
      WHERE primary_cancer_id = ANY(%s)
      ORDER BY id
      """,
      (cancer_ids,),
    )
    if cancer_ids
    else [],
    "primary_cancer_id",
  )
  tnm_by_cancer = _group_by_foreign_key(
    fetch_all(
      """
      SELECT *
      FROM tnm_events
      WHERE primary_cancer_id = ANY(%s)
      ORDER BY event_date_year NULLS LAST, event_date_month NULLS LAST, id
      """,
      (cancer_ids,),
    )
    if cancer_ids
    else [],
    "primary_cancer_id",
  )
  sizes_by_cancer = _group_by_foreign_key(
    fetch_all(
      """
      SELECT *
      FROM tumor_sizes
      WHERE primary_cancer_id = ANY(%s)
      ORDER BY id
      """,
      (cancer_ids,),
    )
    if cancer_ids
    else [],
    "primary_cancer_id",
  )

  imaging_rows = fetch_all(
    """
    SELECT *
    FROM imaging_studies
    WHERE patient_id = %s
    ORDER BY study_date_year NULLS LAST, study_date_month NULLS LAST, id
    """,
    (patient_id,),
  )
  imaging_by_cancer = _group_by_foreign_key(imaging_rows, "primary_cancer_id")
  orphan_imaging = [row for row in imaging_rows if row.get("primary_cancer_id") is None]

  surgery_rows = fetch_all(
    """
    SELECT *
    FROM surgeries
    WHERE patient_id = %s
    ORDER BY surgery_date_year NULLS LAST, surgery_date_month NULLS LAST, id
    """,
    (patient_id,),
  )
  surgeries_by_cancer = _group_by_foreign_key(surgery_rows, "primary_cancer_id")
  orphan_surgeries = [row for row in surgery_rows if row.get("primary_cancer_id") is None]

  radio_rows = fetch_all(
    """
    SELECT *
    FROM radiotherapies
    WHERE patient_id = %s
    ORDER BY start_date_year NULLS LAST, start_date_month NULLS LAST, id
    """,
    (patient_id,),
  )
  radio_by_cancer = _group_by_foreign_key(radio_rows, "primary_cancer_id")
  orphan_radio = [row for row in radio_rows if row.get("primary_cancer_id") is None]

  primary_cancer_payload: list[dict[str, Any]] = []
  for index, cancer in enumerate(cancers):
    cancer_id = int(cancer["id"])
    imaging_list = [_map_imaging_study(row) for row in imaging_by_cancer.get(cancer_id, [])]
    radio_list = [_map_radiotherapy(row) for row in radio_by_cancer.get(cancer_id, [])]
    if index == 0:
      imaging_list.extend(_map_imaging_study(row) for row in orphan_imaging)
      radio_list.extend(_map_radiotherapy(row) for row in orphan_radio)
    primary_cancer_payload.append(
      {
        "cancerOrder": cancer.get("cancer_order"),
        "topographyCode": cancer.get("topography_code"),
        "topographyGroup": cancer.get("topography_group"),
        "morphologyCode": cancer.get("morphology_code"),
        "morphologyGroup": cancer.get("morphology_group"),
        "cancerDiagnosisDateYear": cancer.get("cancer_diagnosis_date_year"),
        "cancerDiagnosisDateMonth": cancer.get("cancer_diagnosis_date_month"),
        "laterality": cancer.get("laterality"),
        "cancerDiagnosisInCenter": cancer.get("cancer_diagnosis_in_center"),
        "cancerDiagnosisMethod": cancer.get("cancer_diagnosis_method"),
        "cancerDiagnosisCode": cancer.get("cancer_diagnosis_code"),
        "cancerCareInCenter": cancer.get("cancer_care_in_center"),
        "primaryCancerGrade": [_map_grade(row) for row in grades_by_cancer.get(cancer_id, [])],
        "primaryCancerStage": [_map_stage(row) for row in stages_by_cancer.get(cancer_id, [])],
        "tumorPathoEvent": [_map_patho_event(row) for row in patho_by_cancer.get(cancer_id, [])],
        "tnmEvent": [_map_tnm_event(row) for row in tnm_by_cancer.get(cancer_id, [])],
        "tumorSize": [_map_tumor_size(row) for row in sizes_by_cancer.get(cancer_id, [])],
        "imaging": imaging_list,
        "surgery": [_map_surgery(row) for row in surgeries_by_cancer.get(cancer_id, [])],
        "radiotherapy": radio_list,
      }
    )

  specimens = fetch_all(
    """
    SELECT *
    FROM biological_specimens
    WHERE patient_id = %s
    ORDER BY specimen_collect_date_year NULLS LAST, specimen_collect_date_month NULLS LAST, id
    """,
    (patient_id,),
  )
  specimen_ids = [int(row["id"]) for row in specimens]
  biomarkers_by_specimen = _group_by_foreign_key(
    fetch_all(
      """
      SELECT *
      FROM biomarkers
      WHERE specimen_id = ANY(%s)
      ORDER BY id
      """,
      (specimen_ids,),
    )
    if specimen_ids
    else [],
    "specimen_id",
  )

  return {
    "ipp": patient.get("ipp") or "",
    "birthDateYear": patient.get("birth_date_year"),
    "birthDateMonth": patient.get("birth_date_month"),
    "sex": patient.get("sex") or "UNKNOWN",
    "deathDateYear": patient.get("death_date_year"),
    "deathDateMonth": patient.get("death_date_month"),
    "lastVisitDateYear": patient.get("last_visit_date_year"),
    "lastVisitDateMonth": patient.get("last_visit_date_month"),
    "lastNewsDateYear": patient.get("last_news_date_year"),
    "lastNewsDateMonth": patient.get("last_news_date_month"),
    "medication": [
      _map_medication(row)
      for row in fetch_all(
        "SELECT * FROM medications WHERE patient_id = %s ORDER BY id",
        (patient_id,),
      )
    ],
    "surgery": [_map_surgery(row) for row in orphan_surgeries],
    "primaryCancer": primary_cancer_payload,
    "biologicalSpecimenList": [
      _map_specimen(row, biomarkers_by_specimen.get(int(row["id"]), []))
      for row in specimens
    ],
    "mesureList": [
      _map_measure(row)
      for row in fetch_all(
        """
        SELECT *
        FROM measures
        WHERE patient_id = %s
        ORDER BY measure_date_year NULLS LAST, measure_date_month NULLS LAST, id
        """,
        (patient_id,),
      )
    ],
  }


def _group_by_foreign_key(
  rows: list[dict[str, Any]],
  key: str,
) -> dict[int, list[dict[str, Any]]]:
  grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
  for row in rows:
    foreign_id = row.get(key)
    if foreign_id is not None:
      grouped[int(foreign_id)].append(row)
  return grouped


def _map_medication(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "medicationName": row.get("medication_name"),
    "dosage": row.get("dosage"),
    "frequency": row.get("frequency"),
    "startDateYear": row.get("start_date_year"),
    "startDateMonth": row.get("start_date_month"),
    "endDateYear": row.get("end_date_year"),
    "endDateMonth": row.get("end_date_month"),
    "indication": row.get("indication"),
  }


def _map_surgery(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "surgeryType": row.get("surgery_type"),
    "surgeryDateYear": row.get("surgery_date_year"),
    "surgeryDateMonth": row.get("surgery_date_month"),
    "topographyCode": row.get("topography_code"),
    "procedureDetails": row.get("procedure_details"),
  }


def _map_measure(row: dict[str, Any]) -> dict[str, Any]:
  value = row.get("measure_value")
  return {
    "measureType": row.get("measure_type"),
    "measureValue": _json_value(value) if value is not None else None,
    "measureUnit": row.get("measure_unit"),
    "measureDateMonth": row.get("measure_date_month"),
    "measureDateYear": row.get("measure_date_year"),
  }


def _map_grade(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "gradeValue": row.get("grade_value"),
    "gradeSystem": row.get("grade_system"),
    "gradeDateYear": row.get("grade_date_year"),
    "gradeDateMonth": row.get("grade_date_month"),
  }


def _map_stage(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "stagingSystem": row.get("staging_system"),
    "tStage": row.get("t_stage"),
    "nStage": row.get("n_stage"),
    "mStage": row.get("m_stage"),
    "overallStage": row.get("overall_stage"),
    "stageDateYear": row.get("stage_date_year"),
    "stageDateMonth": row.get("stage_date_month"),
  }


def _map_patho_event(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "eventType": row.get("event_type"),
    "eventDateYear": row.get("event_date_year"),
    "eventDateMonth": row.get("event_date_month"),
    "description": row.get("description"),
  }


def _map_tnm_event(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "tnmVersion": row.get("tnm_version"),
    "tCategory": row.get("t_category"),
    "nCategory": row.get("n_category"),
    "mCategory": row.get("m_category"),
    "eventDateYear": row.get("event_date_year"),
    "eventDateMonth": row.get("event_date_month"),
  }


def _map_tumor_size(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "sizeValue": _json_value(row.get("size_value")),
    "sizeUnit": row.get("size_unit"),
    "measurementMethod": row.get("measurement_method"),
    "measurementDateYear": row.get("measurement_date_year"),
    "measurementDateMonth": row.get("measurement_date_month"),
  }


def _map_imaging_study(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "studyType": row.get("study_type"),
    "studyDateYear": row.get("study_date_year"),
    "studyDateMonth": row.get("study_date_month"),
    "bodyPart": row.get("body_part"),
    "findings": row.get("findings"),
    "reportText": row.get("report_text"),
  }


def _map_radiotherapy(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "modality": row.get("modality"),
    "totalDose": _json_value(row.get("total_dose")),
    "doseUnit": row.get("dose_unit"),
    "fractions": row.get("fractions"),
    "startDateYear": row.get("start_date_year"),
    "startDateMonth": row.get("start_date_month"),
    "endDateYear": row.get("end_date_year"),
    "endDateMonth": row.get("end_date_month"),
    "targetSite": row.get("target_site"),
  }


def _map_specimen(
  row: dict[str, Any],
  biomarker_rows: list[dict[str, Any]],
) -> dict[str, Any]:
  imaging_raw = row.get("imaging_data")
  imaging: dict[str, Any] | None = None
  if imaging_raw is not None:
    if isinstance(imaging_raw, dict):
      imaging = imaging_raw
    elif isinstance(imaging_raw, str):
      try:
        parsed = json.loads(imaging_raw)
        imaging = parsed if isinstance(parsed, dict) else None
      except ValueError:
        imaging = None

  return {
    "specimenIdentifier": row.get("specimen_identifier"),
    "specimenCollectDateMonth": row.get("specimen_collect_date_month"),
    "specimenCollectDateYear": row.get("specimen_collect_date_year"),
    "specimenType": row.get("specimen_type"),
    "specimenNature": row.get("specimen_nature"),
    "specimenTopographyCode": row.get("specimen_topography_code"),
    "biomarker": [_map_biomarker(b) for b in biomarker_rows],
    "imaging": imaging,
  }


def _map_biomarker(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "biomarkerName": row.get("biomarker_name"),
    "biomarkerValue": row.get("biomarker_value"),
    "biomarkerUnit": row.get("biomarker_unit"),
    "testMethod": row.get("test_method"),
    "testDateYear": row.get("test_date_year"),
    "testDateMonth": row.get("test_date_month"),
  }
