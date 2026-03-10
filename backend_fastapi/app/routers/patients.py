from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..db import fetch_all, fetch_one, get_conn_tx
from ..deps import ClinicianOrAdminUser
from ..schemas import PatientCreateIn


router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("")
def get_patients(_user: ClinicianOrAdminUser) -> list[dict[str, Any]]:
  rows = fetch_all("SELECT * FROM patients ORDER BY id_patient")
  return rows


@router.get("/{patient_id}")
def get_patient(patient_id: int, _user: ClinicianOrAdminUser) -> dict[str, Any]:
  row = fetch_one("SELECT * FROM patients WHERE id_patient = %s", (patient_id,))
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
  return row


@router.post("", status_code=status.HTTP_201_CREATED)
def add_patient(payload: PatientCreateIn, user: ClinicianOrAdminUser) -> dict[str, Any]:
  # Aligné avec ta table `patients` actuelle (setup_database.sql)
  ipp = (payload.ipp or "").strip() or None
  if ipp is None:
    # Comportement similaire au fallback `ARC-${Date.now()}`
    # Ici on fait simple en générant un IPP pseudo-unique.
    import time

    ipp = f"ARC-{user['id']}-{int(time.time() * 1000)}"

  status_value = (payload.status or "pending").strip().lower()
  if status_value not in ("pending", "active", "completed"):
    status_value = "pending"

  sex = (payload.sex or "").strip().upper() or None
  if sex not in (None, "MALE", "FEMALE", "OTHER"):
    sex = None

  health_info_json = json.dumps(payload.health_info) if payload.health_info is not None else None

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
      payload.name,
      ipp,
      payload.birth_date_year,
      payload.birth_date_month,
      payload.birth_date_day,
      sex,
      payload.condition,
      status_value,
      health_info_json,
      int(user["id"]),
      int(user["id"]),
    ),
  )

  if not inserted:
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create patient")

  return {"id": inserted["id_patient"]}


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_patient_json(payload: dict[str, Any], _user: ClinicianOrAdminUser) -> dict[str, Any]:
  if not payload or not payload.get("ipp"):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing ipp in payload")

  conn = get_conn_tx()
  try:
    cur = conn.cursor()

    # Vérifier si le patient existe déjà
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
      "sex": (payload.get("sex") or None),
      "death_date_year": payload.get("deathDateYear"),
      "death_date_month": payload.get("deathDateMonth"),
      "last_visit_date_year": payload.get("lastVisitDateYear"),
      "last_visit_date_month": payload.get("lastVisitDateMonth"),
      "last_news_date_year": payload.get("lastNewsDateYear"),
      "last_news_date_month": payload.get("lastNewsDateMonth"),
    }

    patient_id: int
    if existing:
      patient_id = int(existing["id_patient"])
      fields = [(k, v) for k, v in patient_values.items() if v is not None]
      if fields:
        set_clause = ", ".join(f"{col} = %s" for col, _ in fields)
        values = [v for _, v in fields]
        values.append(patient_id)
        cur.execute(
          f"UPDATE patients SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id_patient = %s",
          tuple(values),
        )
    else:
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
        raise HTTPException(
          status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
          detail="Failed to create patient during import",
        )
      patient_id = int(inserted["id_patient"])

    # Flags pour savoir si on doit nettoyer certaines tables
    primary_cancers = payload.get("primaryCancer") or []
    has_primary_cancer_surgery = any(
      isinstance(cancer.get("surgery"), list) and cancer["surgery"]
      for cancer in primary_cancers
    )
    has_primary_cancer_radiotherapy = any(
      isinstance(cancer.get("radiotherapy"), list) and cancer["radiotherapy"]
      for cancer in primary_cancers
    )

    if has_primary_cancer_surgery or isinstance(payload.get("surgery"), list):
      cur.execute("DELETE FROM surgeries WHERE patient_id = %s", (patient_id,))

    if has_primary_cancer_radiotherapy:
      cur.execute("DELETE FROM radiotherapies WHERE patient_id = %s", (patient_id,))

    # Cancers primaires et sous-objets
    if isinstance(primary_cancers, list) and primary_cancers:
      cur.execute("DELETE FROM primary_cancers WHERE patient_id = %s", (patient_id,))
      for cancer in primary_cancers:
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

        grades = cancer.get("primaryCancerGrade") or []
        for grade in grades:
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

        stages = cancer.get("primaryCancerStage") or []
        for stage in stages:
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

        tumor_events = cancer.get("tumorPathoEvent") or []
        for event in tumor_events:
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

        tnm_events = cancer.get("tnmEvent") or []
        for event in tnm_events:
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

        tumor_sizes = cancer.get("tumorSize") or []
        for size in tumor_sizes:
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

        surgeries = cancer.get("surgery") or []
        for surgery in surgeries:
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

        radiotherapies = cancer.get("radiotherapy") or []
        for radio in radiotherapies:
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

    # Échantillons biologiques
    specimens = payload.get("biologicalSpecimenList") or []
    if isinstance(specimens, list) and specimens:
      cur.execute("DELETE FROM biological_specimens WHERE patient_id = %s", (patient_id,))
      for specimen in specimens:
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

        biomarkers = specimen.get("biomarker") or []
        for biomarker in biomarkers:
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

    # Mesures
    measures = payload.get("mesureList") or []
    if isinstance(measures, list) and measures:
      cur.execute("DELETE FROM measures WHERE patient_id = %s", (patient_id,))
      for measure in measures:
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

    # Médicaments
    medications = payload.get("medication") or []
    if isinstance(medications, list) and medications:
      cur.execute("DELETE FROM medications WHERE patient_id = %s", (patient_id,))
      for medication in medications:
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

    # Chirurgies supplémentaires hors primaryCancer
    extra_surgeries = payload.get("surgery") or []
    if isinstance(extra_surgeries, list) and extra_surgeries:
      for surgery in extra_surgeries:
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

    conn.commit()
    return {"id": patient_id}
  except Exception as exc:
    conn.rollback()
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Failed to import patient: {exc}",
    )
  finally:
    conn.close()

