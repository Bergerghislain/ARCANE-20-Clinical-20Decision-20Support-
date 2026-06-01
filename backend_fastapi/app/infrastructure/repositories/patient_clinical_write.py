"""CRUD section par section pour le dossier clinique structure."""
from __future__ import annotations

import json
from typing import Any

from ...db import execute, fetch_one
from .patient_clinical_read import (
  _map_biomarker,
  _map_imaging_study,
  _map_measure,
  _map_medication,
  _map_radiotherapy,
  _map_specimen,
  _map_surgery,
  _map_tnm_event,
)


def _entity_out(
  row: dict[str, Any],
  mapper: Any,
  *,
  include_primary_cancer: bool = False,
) -> dict[str, Any]:
  payload = mapper(row)
  payload["id"] = int(row["id"])
  if include_primary_cancer and row.get("primary_cancer_id") is not None:
    payload["primaryCancerId"] = int(row["primary_cancer_id"])
  return payload


def _primary_cancer_belongs_to_patient(primary_cancer_id: int, patient_id: int) -> bool:
  row = fetch_one(
    "SELECT 1 FROM primary_cancers WHERE id = %s AND patient_id = %s LIMIT 1",
    (primary_cancer_id, patient_id),
  )
  return row is not None


def _resolve_primary_cancer_id(
  patient_id: int,
  primary_cancer_id: int | None,
) -> int | None:
  if primary_cancer_id is None:
    return None
  if not _primary_cancer_belongs_to_patient(primary_cancer_id, patient_id):
    raise ValueError("primary_cancer_not_found")
  return primary_cancer_id


class SqlPatientClinicalWriteRepository:
  # --- Measures ---
  def create_measure(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = fetch_one(
      """
      INSERT INTO measures (
        patient_id, measure_type, measure_value, measure_unit, measure_date_year, measure_date_month
      ) VALUES (%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        patient_id,
        payload["measureType"],
        payload.get("measureValue"),
        payload["measureUnit"],
        payload.get("measureDateYear"),
        payload.get("measureDateMonth"),
      ),
    )
    return _entity_out(row or {}, _map_measure)

  def update_measure(self, patient_id: int, measure_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    row = fetch_one(
      """
      UPDATE measures
      SET measure_type = %s,
          measure_value = %s,
          measure_unit = %s,
          measure_date_year = %s,
          measure_date_month = %s
      WHERE id = %s AND patient_id = %s
      RETURNING *
      """,
      (
        payload["measureType"],
        payload.get("measureValue"),
        payload["measureUnit"],
        payload.get("measureDateYear"),
        payload.get("measureDateMonth"),
        measure_id,
        patient_id,
      ),
    )
    return _entity_out(row, _map_measure) if row else None

  def delete_measure(self, patient_id: int, measure_id: int) -> bool:
    return execute("DELETE FROM measures WHERE id = %s AND patient_id = %s", (measure_id, patient_id)) > 0

  # --- Medications ---
  def create_medication(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = fetch_one(
      """
      INSERT INTO medications (
        patient_id, medication_name, dosage, frequency,
        start_date_year, start_date_month, end_date_year, end_date_month, indication
      ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        patient_id,
        payload.get("medicationName"),
        payload.get("dosage"),
        payload.get("frequency"),
        payload.get("startDateYear"),
        payload.get("startDateMonth"),
        payload.get("endDateYear"),
        payload.get("endDateMonth"),
        payload.get("indication"),
      ),
    )
    return _entity_out(row or {}, _map_medication)

  def update_medication(self, patient_id: int, medication_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    row = fetch_one(
      """
      UPDATE medications
      SET medication_name = %s, dosage = %s, frequency = %s,
          start_date_year = %s, start_date_month = %s,
          end_date_year = %s, end_date_month = %s, indication = %s
      WHERE id = %s AND patient_id = %s
      RETURNING *
      """,
      (
        payload.get("medicationName"),
        payload.get("dosage"),
        payload.get("frequency"),
        payload.get("startDateYear"),
        payload.get("startDateMonth"),
        payload.get("endDateYear"),
        payload.get("endDateMonth"),
        payload.get("indication"),
        medication_id,
        patient_id,
      ),
    )
    return _entity_out(row, _map_medication) if row else None

  def delete_medication(self, patient_id: int, medication_id: int) -> bool:
    return execute("DELETE FROM medications WHERE id = %s AND patient_id = %s", (medication_id, patient_id)) > 0

  # --- Surgeries ---
  def create_surgery(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    primary_cancer_id = _resolve_primary_cancer_id(patient_id, payload.get("primaryCancerId"))
    row = fetch_one(
      """
      INSERT INTO surgeries (
        patient_id, primary_cancer_id, surgery_type, surgery_date_year, surgery_date_month,
        topography_code, procedure_details
      ) VALUES (%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        patient_id,
        primary_cancer_id,
        payload.get("surgeryType"),
        payload.get("surgeryDateYear"),
        payload.get("surgeryDateMonth"),
        payload.get("topographyCode"),
        payload.get("procedureDetails"),
      ),
    )
    return _entity_out(row or {}, _map_surgery, include_primary_cancer=True)

  def update_surgery(self, patient_id: int, surgery_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    primary_cancer_id = _resolve_primary_cancer_id(patient_id, payload.get("primaryCancerId"))
    row = fetch_one(
      """
      UPDATE surgeries
      SET primary_cancer_id = %s, surgery_type = %s, surgery_date_year = %s, surgery_date_month = %s,
          topography_code = %s, procedure_details = %s
      WHERE id = %s AND patient_id = %s
      RETURNING *
      """,
      (
        primary_cancer_id,
        payload.get("surgeryType"),
        payload.get("surgeryDateYear"),
        payload.get("surgeryDateMonth"),
        payload.get("topographyCode"),
        payload.get("procedureDetails"),
        surgery_id,
        patient_id,
      ),
    )
    return _entity_out(row, _map_surgery, include_primary_cancer=True) if row else None

  def delete_surgery(self, patient_id: int, surgery_id: int) -> bool:
    return execute("DELETE FROM surgeries WHERE id = %s AND patient_id = %s", (surgery_id, patient_id)) > 0

  # --- Radiotherapy ---
  def create_radiotherapy(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    primary_cancer_id = _resolve_primary_cancer_id(patient_id, payload.get("primaryCancerId"))
    row = fetch_one(
      """
      INSERT INTO radiotherapies (
        patient_id, primary_cancer_id, modality, total_dose, dose_unit, fractions,
        start_date_year, start_date_month, end_date_year, end_date_month, target_site
      ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        patient_id,
        primary_cancer_id,
        payload.get("modality"),
        payload.get("totalDose"),
        payload.get("doseUnit"),
        payload.get("fractions"),
        payload.get("startDateYear"),
        payload.get("startDateMonth"),
        payload.get("endDateYear"),
        payload.get("endDateMonth"),
        payload.get("targetSite"),
      ),
    )
    return _entity_out(row or {}, _map_radiotherapy, include_primary_cancer=True)

  def update_radiotherapy(self, patient_id: int, radiotherapy_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    primary_cancer_id = _resolve_primary_cancer_id(patient_id, payload.get("primaryCancerId"))
    row = fetch_one(
      """
      UPDATE radiotherapies
      SET primary_cancer_id = %s, modality = %s, total_dose = %s, dose_unit = %s, fractions = %s,
          start_date_year = %s, start_date_month = %s, end_date_year = %s, end_date_month = %s, target_site = %s
      WHERE id = %s AND patient_id = %s
      RETURNING *
      """,
      (
        primary_cancer_id,
        payload.get("modality"),
        payload.get("totalDose"),
        payload.get("doseUnit"),
        payload.get("fractions"),
        payload.get("startDateYear"),
        payload.get("startDateMonth"),
        payload.get("endDateYear"),
        payload.get("endDateMonth"),
        payload.get("targetSite"),
        radiotherapy_id,
        patient_id,
      ),
    )
    return _entity_out(row, _map_radiotherapy, include_primary_cancer=True) if row else None

  def delete_radiotherapy(self, patient_id: int, radiotherapy_id: int) -> bool:
    return execute(
      "DELETE FROM radiotherapies WHERE id = %s AND patient_id = %s",
      (radiotherapy_id, patient_id),
    ) > 0

  # --- Imaging ---
  def create_imaging_study(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    primary_cancer_id = _resolve_primary_cancer_id(patient_id, payload.get("primaryCancerId"))
    row = fetch_one(
      """
      INSERT INTO imaging_studies (
        patient_id, primary_cancer_id, study_type, study_date_year, study_date_month,
        body_part, findings, report_text
      ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        patient_id,
        primary_cancer_id,
        payload.get("studyType"),
        payload.get("studyDateYear"),
        payload.get("studyDateMonth"),
        payload.get("bodyPart"),
        payload.get("findings"),
        payload.get("reportText"),
      ),
    )
    return _entity_out(row or {}, _map_imaging_study, include_primary_cancer=True)

  def update_imaging_study(self, patient_id: int, imaging_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    primary_cancer_id = _resolve_primary_cancer_id(patient_id, payload.get("primaryCancerId"))
    row = fetch_one(
      """
      UPDATE imaging_studies
      SET primary_cancer_id = %s, study_type = %s, study_date_year = %s, study_date_month = %s,
          body_part = %s, findings = %s, report_text = %s
      WHERE id = %s AND patient_id = %s
      RETURNING *
      """,
      (
        primary_cancer_id,
        payload.get("studyType"),
        payload.get("studyDateYear"),
        payload.get("studyDateMonth"),
        payload.get("bodyPart"),
        payload.get("findings"),
        payload.get("reportText"),
        imaging_id,
        patient_id,
      ),
    )
    return _entity_out(row, _map_imaging_study, include_primary_cancer=True) if row else None

  def delete_imaging_study(self, patient_id: int, imaging_id: int) -> bool:
    return execute(
      "DELETE FROM imaging_studies WHERE id = %s AND patient_id = %s",
      (imaging_id, patient_id),
    ) > 0

  # --- TNM ---
  def create_tnm_event(
    self,
    patient_id: int,
    primary_cancer_id: int,
    payload: dict[str, Any],
  ) -> dict[str, Any]:
    if not _primary_cancer_belongs_to_patient(primary_cancer_id, patient_id):
      raise ValueError("primary_cancer_not_found")
    row = fetch_one(
      """
      INSERT INTO tnm_events (
        primary_cancer_id, tnm_version, t_category, n_category, m_category,
        event_date_year, event_date_month
      ) VALUES (%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        primary_cancer_id,
        payload.get("tnmVersion"),
        payload.get("tCategory"),
        payload.get("nCategory"),
        payload.get("mCategory"),
        payload.get("eventDateYear"),
        payload.get("eventDateMonth"),
      ),
    )
    return _entity_out(row or {}, _map_tnm_event)

  def update_tnm_event(
    self,
    patient_id: int,
    primary_cancer_id: int,
    tnm_id: int,
    payload: dict[str, Any],
  ) -> dict[str, Any] | None:
    if not _primary_cancer_belongs_to_patient(primary_cancer_id, patient_id):
      raise ValueError("primary_cancer_not_found")
    row = fetch_one(
      """
      UPDATE tnm_events
      SET tnm_version = %s, t_category = %s, n_category = %s, m_category = %s,
          event_date_year = %s, event_date_month = %s
      WHERE id = %s AND primary_cancer_id = %s
      RETURNING *
      """,
      (
        payload.get("tnmVersion"),
        payload.get("tCategory"),
        payload.get("nCategory"),
        payload.get("mCategory"),
        payload.get("eventDateYear"),
        payload.get("eventDateMonth"),
        tnm_id,
        primary_cancer_id,
      ),
    )
    return _entity_out(row, _map_tnm_event) if row else None

  def delete_tnm_event(self, patient_id: int, primary_cancer_id: int, tnm_id: int) -> bool:
    if not _primary_cancer_belongs_to_patient(primary_cancer_id, patient_id):
      raise ValueError("primary_cancer_not_found")
    return execute(
      "DELETE FROM tnm_events WHERE id = %s AND primary_cancer_id = %s",
      (tnm_id, primary_cancer_id),
    ) > 0

  # --- Specimens + biomarkers ---
  def create_specimen(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    imaging = payload.get("imaging")
    row = fetch_one(
      """
      INSERT INTO biological_specimens (
        patient_id, specimen_identifier, specimen_collect_date_month, specimen_collect_date_year,
        specimen_type, specimen_nature, specimen_topography_code, imaging_data
      ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        patient_id,
        payload.get("specimenIdentifier"),
        payload.get("specimenCollectDateMonth"),
        payload.get("specimenCollectDateYear"),
        payload.get("specimenType"),
        payload.get("specimenNature"),
        payload.get("specimenTopographyCode"),
        json.dumps(imaging) if imaging is not None else None,
      ),
    )
    return _entity_out(row or {}, lambda r: _map_specimen(r, []))

  def update_specimen(self, patient_id: int, specimen_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    imaging = payload.get("imaging")
    row = fetch_one(
      """
      UPDATE biological_specimens
      SET specimen_identifier = %s, specimen_collect_date_month = %s, specimen_collect_date_year = %s,
          specimen_type = %s, specimen_nature = %s, specimen_topography_code = %s, imaging_data = %s
      WHERE id = %s AND patient_id = %s
      RETURNING *
      """,
      (
        payload.get("specimenIdentifier"),
        payload.get("specimenCollectDateMonth"),
        payload.get("specimenCollectDateYear"),
        payload.get("specimenType"),
        payload.get("specimenNature"),
        payload.get("specimenTopographyCode"),
        json.dumps(imaging) if imaging is not None else None,
        specimen_id,
        patient_id,
      ),
    )
    if not row:
      return None
    biomarkers = fetch_all_biomarkers_for_specimen(specimen_id)
    return _entity_out(row, lambda r: _map_specimen(r, biomarkers))

  def delete_specimen(self, patient_id: int, specimen_id: int) -> bool:
    return execute(
      "DELETE FROM biological_specimens WHERE id = %s AND patient_id = %s",
      (specimen_id, patient_id),
    ) > 0

  def create_biomarker(self, patient_id: int, specimen_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    if not fetch_one(
      "SELECT 1 FROM biological_specimens WHERE id = %s AND patient_id = %s LIMIT 1",
      (specimen_id, patient_id),
    ):
      raise ValueError("specimen_not_found")
    row = fetch_one(
      """
      INSERT INTO biomarkers (
        specimen_id, biomarker_name, biomarker_value, biomarker_unit, test_method,
        test_date_year, test_date_month
      ) VALUES (%s,%s,%s,%s,%s,%s,%s)
      RETURNING *
      """,
      (
        specimen_id,
        payload.get("biomarkerName") or "",
        payload.get("biomarkerValue"),
        payload.get("biomarkerUnit"),
        payload.get("testMethod"),
        payload.get("testDateYear"),
        payload.get("testDateMonth"),
      ),
    )
    return _entity_out(row or {}, _map_biomarker)

  def update_biomarker(
    self,
    patient_id: int,
    specimen_id: int,
    biomarker_id: int,
    payload: dict[str, Any],
  ) -> dict[str, Any] | None:
    if not fetch_one(
      "SELECT 1 FROM biological_specimens WHERE id = %s AND patient_id = %s LIMIT 1",
      (specimen_id, patient_id),
    ):
      raise ValueError("specimen_not_found")
    row = fetch_one(
      """
      UPDATE biomarkers
      SET biomarker_name = %s, biomarker_value = %s, biomarker_unit = %s, test_method = %s,
          test_date_year = %s, test_date_month = %s
      WHERE id = %s AND specimen_id = %s
      RETURNING *
      """,
      (
        payload.get("biomarkerName") or "",
        payload.get("biomarkerValue"),
        payload.get("biomarkerUnit"),
        payload.get("testMethod"),
        payload.get("testDateYear"),
        payload.get("testDateMonth"),
        biomarker_id,
        specimen_id,
      ),
    )
    return _entity_out(row, _map_biomarker) if row else None

  def delete_biomarker(self, patient_id: int, specimen_id: int, biomarker_id: int) -> bool:
    if not fetch_one(
      "SELECT 1 FROM biological_specimens WHERE id = %s AND patient_id = %s LIMIT 1",
      (specimen_id, patient_id),
    ):
      raise ValueError("specimen_not_found")
    return execute(
      "DELETE FROM biomarkers WHERE id = %s AND specimen_id = %s",
      (biomarker_id, specimen_id),
    ) > 0


def fetch_all_biomarkers_for_specimen(specimen_id: int) -> list[dict[str, Any]]:
  from ...db import fetch_all

  return fetch_all("SELECT * FROM biomarkers WHERE specimen_id = %s ORDER BY id", (specimen_id,))
