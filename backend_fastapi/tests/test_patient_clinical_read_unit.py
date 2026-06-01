from __future__ import annotations

from unittest.mock import patch

from backend_fastapi.app.infrastructure.repositories import patient_clinical_read as clinical_read


def test_find_clinical_bundle_maps_patient_and_measures():
  patient_row = {
    "ipp": "arcane1",
    "birth_date_year": 1962,
    "birth_date_month": 1,
    "sex": "MALE",
    "death_date_year": 2022,
    "death_date_month": 3,
    "last_visit_date_year": 2022,
    "last_visit_date_month": 3,
    "last_news_date_year": 2022,
    "last_news_date_month": 3,
  }
  measure_row = {
    "measure_type": "HEIGHT",
    "measure_value": 167.0,
    "measure_unit": "CM",
    "measure_date_month": 3,
    "measure_date_year": 2010,
  }
  cancer_row = {
    "id": 1,
    "cancer_order": None,
    "topography_code": "C42.2",
    "topography_group": None,
    "morphology_code": "8000/3",
    "morphology_group": None,
    "cancer_diagnosis_date_year": 2002,
    "cancer_diagnosis_date_month": 7,
    "laterality": None,
    "cancer_diagnosis_in_center": True,
    "cancer_diagnosis_method": None,
    "cancer_diagnosis_code": None,
    "cancer_care_in_center": None,
  }
  specimen_row = {
    "id": 10,
    "specimen_identifier": "15H10881",
    "specimen_collect_date_month": 11,
    "specimen_collect_date_year": 2015,
    "specimen_type": "BIOPSY",
    "specimen_nature": "TUMORAL",
    "specimen_topography_code": "C22.0",
    "imaging_data": None,
  }

  def fake_fetch_one(query: str, params: tuple):  # noqa: ANN001
    if "FROM patients" in query:
      return patient_row
    return None

  def fake_fetch_all(query: str, params: tuple):  # noqa: ANN001
    if "FROM primary_cancers" in query:
      return [cancer_row]
    if "FROM measures" in query:
      return [measure_row]
    if "FROM biological_specimens" in query:
      return [specimen_row]
    if "FROM medications" in query or "FROM surgeries" in query:
      return []
    if "FROM imaging_studies" in query or "FROM radiotherapies" in query:
      return []
    if "primary_cancer_grades" in query or "primary_cancer_stages" in query:
      return []
    if "tumor_patho_events" in query or "tnm_events" in query or "tumor_sizes" in query:
      return []
    if "FROM biomarkers" in query:
      return []
    return []

  with patch.object(clinical_read, "fetch_one", side_effect=fake_fetch_one):
    with patch.object(clinical_read, "fetch_all", side_effect=fake_fetch_all):
      bundle = clinical_read.find_clinical_bundle(1)

  assert bundle is not None
  assert bundle["ipp"] == "arcane1"
  assert bundle["mesureList"][0]["measureType"] == "HEIGHT"
  assert bundle["primaryCancer"][0]["topographyCode"] == "C42.2"
  assert bundle["biologicalSpecimenList"][0]["specimenIdentifier"] == "15H10881"
