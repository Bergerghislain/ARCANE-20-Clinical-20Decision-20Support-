from __future__ import annotations

import json
from typing import Any

from ...db import fetch_all, fetch_one
from ..db.unit_of_work import DbUnitOfWork

MANUAL_PROFILE_KEY = "manual_profile"
MANUAL_PROFILE_VERSION_KEY = "manual_profile_version"
MANUAL_PROFILE_SCHEMA_VERSION_KEY = "manual_profile_schema_version"


class SqlPatientRepository:
  def list_patients(self) -> list[dict[str, Any]]:
    return fetch_all("SELECT * FROM patients ORDER BY id_patient")

  def find_patient(self, patient_id: int) -> dict[str, Any] | None:
    return fetch_one("SELECT * FROM patients WHERE id_patient = %s", (patient_id,))

  def create_patient(self, payload: dict[str, Any]) -> int | None:
    inserted = fetch_one(
      """
      INSERT INTO patients (
        name,
        ipp,
        birth_date_year,
        birth_date_month,
        birth_date_day,
        sex,
        condition,
        status,
        health_info,
        created_by,
        updated_by
      )
      VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING id_patient
      """,
      (
        payload.get("name"),
        payload.get("ipp"),
        payload.get("birth_date_year"),
        payload.get("birth_date_month"),
        payload.get("birth_date_day"),
        payload.get("sex"),
        payload.get("condition"),
        payload.get("status"),
        payload.get("health_info"),
        payload.get("created_by"),
        payload.get("updated_by"),
      ),
    )
    if not inserted:
      return None
    return int(inserted["id_patient"])

  def update_patient(self, patient_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    if not updates:
      return None
    columns = list(updates.keys())
    values = [updates[col] for col in columns]
    set_clause = ", ".join(f"{col} = %s" for col in columns)
    query = (
      f"UPDATE patients SET {set_clause}, updated_at = CURRENT_TIMESTAMP "
      "WHERE id_patient = %s RETURNING *"
    )
    values.append(patient_id)
    return fetch_one(query, tuple(values))

  def find_patient_profile(self, patient_id: int) -> dict[str, Any] | None:
    row = fetch_one(
      """
      SELECT health_info
      FROM patients
      WHERE id_patient = %s
      LIMIT 1
      """,
      (patient_id,),
    )
    if not row:
      return None

    health_info = _coerce_health_info(row.get("health_info"))
    return _extract_profile_record(health_info)

  def save_patient_profile(
    self,
    patient_id: int,
    profile: dict[str, Any],
    expected_version: int | None = None,
  ) -> dict[str, Any] | None:
    with DbUnitOfWork() as uow:
      cur = uow.cursor
      if cur is None:
        raise RuntimeError("Transaction cursor not initialized")

      cur.execute(
        """
        SELECT health_info
        FROM patients
        WHERE id_patient = %s
        LIMIT 1
        FOR UPDATE
        """,
        (patient_id,),
      )
      row = cur.fetchone()
      if not row:
        return None

      health_info = _coerce_health_info(row.get("health_info"))
      current_record = _extract_profile_record(health_info)
      current_version = (
        int(current_record["profile_version"]) if current_record is not None else 0
      )

      # Compatibilite legacy:
      # - profil inexistant => on accepte une creation sans version attendue.
      # - profil existant => version requise pour activer l'optimistic locking.
      if expected_version is None and current_version > 0:
        return {
          "status": "conflict",
          "current_version": current_version,
          "reason": "missing_expected_version",
        }

      if expected_version is not None and expected_version != current_version:
        return {
          "status": "conflict",
          "current_version": current_version,
          "reason": "version_mismatch",
        }

      next_version = current_version + 1
      normalized_profile = dict(profile)
      normalized_profile["patientId"] = str(patient_id)

      health_info[MANUAL_PROFILE_KEY] = normalized_profile
      health_info[MANUAL_PROFILE_VERSION_KEY] = next_version
      health_info[MANUAL_PROFILE_SCHEMA_VERSION_KEY] = _to_int(
        normalized_profile.get("schemaVersion"),
        default=1,
      )

      cur.execute(
        """
        UPDATE patients
        SET health_info = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_patient = %s
        RETURNING health_info
        """,
        (json.dumps(health_info), patient_id),
      )
      updated = cur.fetchone()
      if not updated:
        return None

      uow.commit()
      updated_health_info = _coerce_health_info(updated.get("health_info"))
      saved_record = _extract_profile_record(updated_health_info)
      if not saved_record:
        return None
      return {
        "status": "saved",
        **saved_record,
      }

  def import_patient_payload(self, payload: dict[str, Any]) -> int:
    with DbUnitOfWork() as uow:
      cur = uow.cursor
      if cur is None:
        raise RuntimeError("Transaction cursor not initialized")

      patient_id = self._upsert_patient(cur, payload)

      primary_cancers = payload.get("primaryCancer") or []
      has_primary_cancer_surgery = any(
        isinstance(cancer.get("surgery"), list) and cancer["surgery"]
        for cancer in primary_cancers
        if isinstance(cancer, dict)
      )
      has_primary_cancer_radiotherapy = any(
        isinstance(cancer.get("radiotherapy"), list) and cancer["radiotherapy"]
        for cancer in primary_cancers
        if isinstance(cancer, dict)
      )

      if has_primary_cancer_surgery or isinstance(payload.get("surgery"), list):
        cur.execute("DELETE FROM surgeries WHERE patient_id = %s", (patient_id,))

      if has_primary_cancer_radiotherapy:
        cur.execute("DELETE FROM radiotherapies WHERE patient_id = %s", (patient_id,))

      self._sync_primary_cancers(cur, patient_id, primary_cancers)
      self._sync_specimens(cur, patient_id, payload.get("biologicalSpecimenList") or [])
      self._sync_measures(cur, patient_id, payload.get("mesureList") or [])
      self._sync_medications(cur, patient_id, payload.get("medication") or [])
      self._sync_extra_surgeries(cur, patient_id, payload.get("surgery") or [])

      uow.commit()
      return patient_id

  def _upsert_patient(self, cur: Any, payload: dict[str, Any]) -> int:
    cur.execute(
      "SELECT id_patient FROM patients WHERE ipp = %s",
      (payload["ipp"],),
    )
    existing = cur.fetchone()

    patient_values = {
      "ipp": payload.get("ipp"),
      "birth_date_year": payload.get("birthDateYear"),
      "birth_date_month": payload.get("birthDateMonth"),
      "birth_date_day": payload.get("birthDateDay"),
      "sex": payload.get("sex") or None,
      "death_date_year": payload.get("deathDateYear"),
      "death_date_month": payload.get("deathDateMonth"),
      "last_visit_date_year": payload.get("lastVisitDateYear"),
      "last_visit_date_month": payload.get("lastVisitDateMonth"),
      "last_news_date_year": payload.get("lastNewsDateYear"),
      "last_news_date_month": payload.get("lastNewsDateMonth"),
    }

    if existing:
      patient_id = int(existing["id_patient"])
      fields = [(k, v) for k, v in patient_values.items() if v is not None]
      if fields:
        set_clause = ", ".join(f"{col} = %s" for col, _ in fields)
        values = [value for _, value in fields]
        values.append(patient_id)
        cur.execute(
          f"UPDATE patients SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id_patient = %s",
          tuple(values),
        )
      return patient_id

    cur.execute(
      """
      INSERT INTO patients (
        ipp,
        birth_date_year,
        birth_date_month,
        birth_date_day,
        sex,
        death_date_year,
        death_date_month,
        last_visit_date_year,
        last_visit_date_month,
        last_news_date_year,
        last_news_date_month
      )
      VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING id_patient
      """,
      (
        patient_values["ipp"],
        patient_values["birth_date_year"],
        patient_values["birth_date_month"],
        patient_values["birth_date_day"],
        patient_values["sex"],
        patient_values["death_date_year"],
        patient_values["death_date_month"],
        patient_values["last_visit_date_year"],
        patient_values["last_visit_date_month"],
        patient_values["last_news_date_year"],
        patient_values["last_news_date_month"],
      ),
    )
    inserted = cur.fetchone()
    if not inserted:
      raise RuntimeError("Failed to create patient during import")
    return int(inserted["id_patient"])

  def _sync_primary_cancers(self, cur: Any, patient_id: int, primary_cancers: list[Any]) -> None:
    if not isinstance(primary_cancers, list) or not primary_cancers:
      return

    cur.execute("DELETE FROM primary_cancers WHERE patient_id = %s", (patient_id,))
    for cancer in primary_cancers:
      if not isinstance(cancer, dict):
        continue
      cur.execute(
        """
        INSERT INTO primary_cancers (
          patient_id,
          cancer_order,
          topography_code,
          topography_group,
          morphology_code,
          morphology_group,
          cancer_diagnosis_date_year,
          cancer_diagnosis_date_month,
          laterality,
          cancer_diagnosis_in_center,
          cancer_diagnosis_method,
          cancer_diagnosis_code,
          cancer_care_in_center
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
          patient_id,
          cancer.get("cancerOrder"),
          cancer.get("topographyCode"),
          cancer.get("topographyGroup"),
          cancer.get("morphologyCode"),
          cancer.get("morphologyGroup"),
          cancer.get("cancerDiagnosisDateYear"),
          cancer.get("cancerDiagnosisDateMonth"),
          cancer.get("laterality"),
          cancer.get("cancerDiagnosisInCenter"),
          cancer.get("cancerDiagnosisMethod"),
          cancer.get("cancerDiagnosisCode"),
          cancer.get("cancerCareInCenter"),
        ),
      )
      cancer_row = cur.fetchone()
      if not cancer_row:
        continue
      primary_cancer_id = int(cancer_row["id"])
      self._insert_grades(cur, primary_cancer_id, cancer.get("primaryCancerGrade") or [])
      self._insert_stages(cur, primary_cancer_id, cancer.get("primaryCancerStage") or [])
      self._insert_tumor_events(cur, primary_cancer_id, cancer.get("tumorPathoEvent") or [])
      self._insert_tnm_events(cur, primary_cancer_id, cancer.get("tnmEvent") or [])
      self._insert_tumor_sizes(cur, primary_cancer_id, cancer.get("tumorSize") or [])
      self._insert_surgeries(cur, patient_id, cancer.get("surgery") or [])
      self._insert_radiotherapies(cur, patient_id, cancer.get("radiotherapy") or [])

  def _insert_grades(self, cur: Any, primary_cancer_id: int, grades: list[Any]) -> None:
    for grade in grades:
      if not isinstance(grade, dict):
        continue
      cur.execute(
        """
        INSERT INTO primary_cancer_grades (
          primary_cancer_id, grade_value, grade_system, grade_date_year, grade_date_month
        ) VALUES (%s,%s,%s,%s,%s)
        """,
        (
          primary_cancer_id,
          grade.get("gradeValue"),
          grade.get("gradeSystem"),
          grade.get("gradeDateYear"),
          grade.get("gradeDateMonth"),
        ),
      )

  def _insert_stages(self, cur: Any, primary_cancer_id: int, stages: list[Any]) -> None:
    for stage in stages:
      if not isinstance(stage, dict):
        continue
      cur.execute(
        """
        INSERT INTO primary_cancer_stages (
          primary_cancer_id, staging_system, t_stage, n_stage, m_stage, overall_stage, stage_date_year, stage_date_month
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
          primary_cancer_id,
          stage.get("stagingSystem"),
          stage.get("tStage"),
          stage.get("nStage"),
          stage.get("mStage"),
          stage.get("overallStage"),
          stage.get("stageDateYear"),
          stage.get("stageDateMonth"),
        ),
      )

  def _insert_tumor_events(self, cur: Any, primary_cancer_id: int, events: list[Any]) -> None:
    for event in events:
      if not isinstance(event, dict):
        continue
      cur.execute(
        """
        INSERT INTO tumor_patho_events (
          primary_cancer_id, event_type, event_date_year, event_date_month, description
        ) VALUES (%s,%s,%s,%s,%s)
        """,
        (
          primary_cancer_id,
          event.get("eventType"),
          event.get("eventDateYear"),
          event.get("eventDateMonth"),
          event.get("description"),
        ),
      )

  def _insert_tnm_events(self, cur: Any, primary_cancer_id: int, events: list[Any]) -> None:
    for event in events:
      if not isinstance(event, dict):
        continue
      cur.execute(
        """
        INSERT INTO tnm_events (
          primary_cancer_id, tnm_version, t_category, n_category, m_category, event_date_year, event_date_month
        ) VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (
          primary_cancer_id,
          event.get("tnmVersion"),
          event.get("tCategory"),
          event.get("nCategory"),
          event.get("mCategory"),
          event.get("eventDateYear"),
          event.get("eventDateMonth"),
        ),
      )

  def _insert_tumor_sizes(self, cur: Any, primary_cancer_id: int, sizes: list[Any]) -> None:
    for size in sizes:
      if not isinstance(size, dict):
        continue
      cur.execute(
        """
        INSERT INTO tumor_sizes (
          primary_cancer_id, size_value, size_unit, measurement_method, measurement_date_year, measurement_date_month
        ) VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (
          primary_cancer_id,
          size.get("sizeValue"),
          size.get("sizeUnit"),
          size.get("measurementMethod"),
          size.get("measurementDateYear"),
          size.get("measurementDateMonth"),
        ),
      )

  def _insert_surgeries(self, cur: Any, patient_id: int, surgeries: list[Any]) -> None:
    for surgery in surgeries:
      if not isinstance(surgery, dict):
        continue
      cur.execute(
        """
        INSERT INTO surgeries (
          patient_id, surgery_type, surgery_date_year, surgery_date_month, topography_code, procedure_details
        ) VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (
          patient_id,
          surgery.get("surgeryType"),
          surgery.get("surgeryDateYear"),
          surgery.get("surgeryDateMonth"),
          surgery.get("topographyCode"),
          surgery.get("procedureDetails"),
        ),
      )

  def _insert_radiotherapies(self, cur: Any, patient_id: int, radiotherapies: list[Any]) -> None:
    for radio in radiotherapies:
      if not isinstance(radio, dict):
        continue
      cur.execute(
        """
        INSERT INTO radiotherapies (
          patient_id, modality, total_dose, dose_unit, fractions, start_date_year, start_date_month, end_date_year, end_date_month, target_site
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
          patient_id,
          radio.get("modality"),
          radio.get("totalDose"),
          radio.get("doseUnit"),
          radio.get("fractions"),
          radio.get("startDateYear"),
          radio.get("startDateMonth"),
          radio.get("endDateYear"),
          radio.get("endDateMonth"),
          radio.get("targetSite"),
        ),
      )

  def _sync_specimens(self, cur: Any, patient_id: int, specimens: list[Any]) -> None:
    if not isinstance(specimens, list) or not specimens:
      return

    cur.execute("DELETE FROM biological_specimens WHERE patient_id = %s", (patient_id,))
    for specimen in specimens:
      if not isinstance(specimen, dict):
        continue
      cur.execute(
        """
        INSERT INTO biological_specimens (
          patient_id,
          specimen_identifier,
          specimen_collect_date_month,
          specimen_collect_date_year,
          specimen_type,
          specimen_nature,
          specimen_topography_code,
          imaging_data
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
          patient_id,
          specimen.get("specimenIdentifier"),
          specimen.get("specimenCollectDateMonth"),
          specimen.get("specimenCollectDateYear"),
          specimen.get("specimenType"),
          specimen.get("specimenNature"),
          specimen.get("specimenTopographyCode"),
          specimen.get("imaging"),
        ),
      )
      spec_row = cur.fetchone()
      if not spec_row:
        continue
      specimen_id = int(spec_row["id"])
      self._insert_biomarkers(cur, specimen_id, specimen.get("biomarker") or [])

  def _insert_biomarkers(self, cur: Any, specimen_id: int, biomarkers: list[Any]) -> None:
    for biomarker in biomarkers:
      if not isinstance(biomarker, dict):
        continue
      cur.execute(
        """
        INSERT INTO biomarkers (
          specimen_id, biomarker_name, biomarker_value, biomarker_unit, test_method, test_date_year, test_date_month
        ) VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (
          specimen_id,
          biomarker.get("biomarkerName") or "",
          biomarker.get("biomarkerValue"),
          biomarker.get("biomarkerUnit"),
          biomarker.get("testMethod"),
          biomarker.get("testDateYear"),
          biomarker.get("testDateMonth"),
        ),
      )

  def _sync_measures(self, cur: Any, patient_id: int, measures: list[Any]) -> None:
    if not isinstance(measures, list) or not measures:
      return

    cur.execute("DELETE FROM measures WHERE patient_id = %s", (patient_id,))
    for measure in measures:
      if not isinstance(measure, dict):
        continue
      cur.execute(
        """
        INSERT INTO measures (
          patient_id, measure_type, measure_value, measure_unit, measure_date_year, measure_date_month
        ) VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (
          patient_id,
          measure.get("measureType"),
          measure.get("measureValue"),
          measure.get("measureUnit"),
          measure.get("measureDateYear"),
          measure.get("measureDateMonth"),
        ),
      )

  def _sync_medications(self, cur: Any, patient_id: int, medications: list[Any]) -> None:
    if not isinstance(medications, list) or not medications:
      return

    cur.execute("DELETE FROM medications WHERE patient_id = %s", (patient_id,))
    for medication in medications:
      if not isinstance(medication, dict):
        continue
      cur.execute(
        """
        INSERT INTO medications (
          patient_id, medication_name, dosage, frequency, start_date_year, start_date_month, end_date_year, end_date_month, indication
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
          patient_id,
          medication.get("medicationName") or "",
          medication.get("dosage"),
          medication.get("frequency"),
          medication.get("startDateYear"),
          medication.get("startDateMonth"),
          medication.get("endDateYear"),
          medication.get("endDateMonth"),
          medication.get("indication"),
        ),
      )

  def _sync_extra_surgeries(self, cur: Any, patient_id: int, surgeries: list[Any]) -> None:
    if not isinstance(surgeries, list) or not surgeries:
      return

    self._insert_surgeries(cur, patient_id, surgeries)


def _coerce_health_info(raw: Any) -> dict[str, Any]:
  if isinstance(raw, dict):
    return dict(raw)
  if isinstance(raw, str):
    try:
      parsed = json.loads(raw)
      if isinstance(parsed, dict):
        return parsed
    except ValueError:
      return {}
  return {}


def _to_int(value: Any, default: int = 0) -> int:
  if isinstance(value, int):
    return int(value)
  if isinstance(value, str):
    try:
      return int(value)
    except ValueError:
      return default
  return default


def _extract_profile_record(health_info: dict[str, Any]) -> dict[str, Any] | None:
  profile = health_info.get(MANUAL_PROFILE_KEY)
  if not isinstance(profile, dict):
    return None

  profile_version = _to_int(health_info.get(MANUAL_PROFILE_VERSION_KEY), default=0)
  schema_version = _to_int(
    health_info.get(MANUAL_PROFILE_SCHEMA_VERSION_KEY),
    default=_to_int(profile.get("schemaVersion"), default=1),
  )
  return {
    "profile": profile,
    "profile_version": profile_version,
    "schema_version": schema_version,
  }

