from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, constr


class StrictModel(BaseModel):
  model_config = ConfigDict(extra="forbid")


class UserOut(BaseModel):
  id: int
  username: str
  email: str
  role: str
  full_name: str | None = None


class LoginIn(BaseModel):
  identifier: str
  password: str


class LoginOut(BaseModel):
  token: str
  user: UserOut

class RegisterIn(BaseModel):
  email: EmailStr
  username: constr(min_length=3, max_length=100)
  full_name: str | None = None
  # Bcrypt tronque au-delà de 72 octets : on borne aussi côté DTO.
  password: constr(min_length=8, max_length=72)

class PatientCreateIn(StrictModel):
  name: constr(min_length=1, max_length=255) | None = None
  ipp: constr(min_length=1, max_length=120) | None = None
  condition: constr(max_length=5000) | None = None
  status: Literal["pending", "active", "completed"] | None = None
  birth_date_year: int | None = Field(default=None, ge=1900, le=2100)
  birth_date_month: int | None = Field(default=None, ge=1, le=12)
  birth_date_day: int | None = Field(default=None, ge=1, le=31)
  sex: str | None = None
  health_info: dict[str, Any] | None = Field(
    default=None,
    validation_alias=AliasChoices("health_info", "healthInfo"),
  )
  assigned_clinician_id: int | None = Field(
    default=None,
    ge=1,
    validation_alias=AliasChoices("assigned_clinician_id", "assignedClinicianId"),
  )
  age: int | float | None = Field(default=None, ge=0, le=130)
  gender: str | None = None
  birthDate: constr(max_length=40) | None = None


class PatientUpdateIn(PatientCreateIn):
  pass


class SexValue(StrEnum):
  MALE = "MALE"
  FEMALE = "FEMALE"
  OTHER = "OTHER"
  UNKNOWN = "UNKNOWN"


class MeasureTypeValue(StrEnum):
  HEIGHT = "HEIGHT"
  WEIGHT = "WEIGHT"
  BMI = "BMI"
  BSA = "BSA"
  BLOOD_PRESSURE = "BLOOD_PRESSURE"
  OTHER = "OTHER"


class SpecimenTypeValue(StrEnum):
  BIOPSY = "BIOPSY"
  BLOOD = "BLOOD"
  SURGERY = "SURGERY"
  CYTOLOGY = "CYTOLOGY"
  OTHER = "OTHER"


class SpecimenNatureValue(StrEnum):
  TUMORAL = "TUMORAL"
  BENIGN = "BENIGN"
  NORMAL = "NORMAL"
  METASTATIC = "METASTATIC"
  OTHER = "OTHER"


class PatientAnalysisIn(StrictModel):
  name: constr(min_length=1, max_length=150)
  value: constr(min_length=1, max_length=150)
  unit: constr(max_length=50) | None = None
  referenceRange: constr(max_length=100) | None = None
  date: constr(pattern=r"^\d{4}(-\d{2}(-\d{2})?)?$") | None = None


class PatientReportIn(StrictModel):
  conclusion: constr(min_length=1, max_length=5000)
  reasoning: constr(min_length=1, max_length=10000)
  sources: list[constr(min_length=1, max_length=500)] = Field(min_length=1)


class PatientReportMetaIn(StrictModel):
  generator: constr(min_length=1, max_length=80) = "argos-simulated"
  generatedAt: constr(pattern=r"^\d{4}-\d{2}-\d{2}T.*Z$") | None = None


class MedicationIn(StrictModel):
  medicationName: constr(max_length=200) | None = None
  dosage: constr(max_length=100) | None = None
  frequency: constr(max_length=100) | None = None
  startDateYear: int | None = Field(default=None, ge=1900, le=2100)
  startDateMonth: int | None = Field(default=None, ge=1, le=12)
  endDateYear: int | None = Field(default=None, ge=1900, le=2100)
  endDateMonth: int | None = Field(default=None, ge=1, le=12)
  indication: constr(max_length=500) | None = None


class SurgeryIn(StrictModel):
  surgeryType: constr(max_length=120) | None = None
  surgeryDateYear: int | None = Field(default=None, ge=1900, le=2100)
  surgeryDateMonth: int | None = Field(default=None, ge=1, le=12)
  topographyCode: constr(max_length=20) | None = None
  procedureDetails: constr(max_length=1000) | None = None


class PrimaryCancerIn(StrictModel):
  cancerOrder: int | None = Field(default=None, ge=1, le=20)
  topographyCode: constr(max_length=20) | None = None
  topographyGroup: constr(max_length=100) | None = None
  morphologyCode: constr(max_length=20) | None = None
  morphologyGroup: constr(max_length=100) | None = None
  cancerDiagnosisDateYear: int | None = Field(default=None, ge=1900, le=2100)
  cancerDiagnosisDateMonth: int | None = Field(default=None, ge=1, le=12)
  laterality: constr(max_length=30) | None = None
  cancerDiagnosisInCenter: bool | None = None
  cancerDiagnosisMethod: constr(max_length=100) | None = None
  cancerDiagnosisCode: constr(max_length=50) | None = None
  cancerCareInCenter: bool | None = None
  primaryCancerGrade: list[dict[str, Any]] = Field(default_factory=list)
  primaryCancerStage: list[dict[str, Any]] = Field(default_factory=list)
  tumorPathoEvent: list[dict[str, Any]] = Field(default_factory=list)
  tnmEvent: list[dict[str, Any]] = Field(default_factory=list)
  tumorSize: list[dict[str, Any]] = Field(default_factory=list)
  imaging: list[dict[str, Any]] = Field(default_factory=list)
  surgery: list[SurgeryIn] = Field(default_factory=list)
  radiotherapy: list[dict[str, Any]] = Field(default_factory=list)


class BiologicalSpecimenIn(StrictModel):
  specimenIdentifier: constr(max_length=150) | None = None
  specimenCollectDateMonth: int | None = Field(default=None, ge=1, le=12)
  specimenCollectDateYear: int | None = Field(default=None, ge=1900, le=2100)
  specimenType: SpecimenTypeValue | None = None
  specimenNature: SpecimenNatureValue | None = None
  specimenTopographyCode: constr(max_length=20) | None = None
  biomarker: list[dict[str, Any]] = Field(default_factory=list)
  imaging: dict[str, Any] | None = None


class MeasureIn(StrictModel):
  measureType: MeasureTypeValue
  measureValue: float | None = Field(default=None, ge=0, le=500)
  measureUnit: constr(min_length=1, max_length=20)
  measureDateMonth: int | None = Field(default=None, ge=1, le=12)
  measureDateYear: int | None = Field(default=None, ge=1900, le=2100)


class PatientClinicalDataIn(StrictModel):
  ipp: constr(min_length=1, max_length=120)
  birthDateYear: int | None = Field(default=None, ge=1900, le=2100)
  birthDateMonth: int | None = Field(default=None, ge=1, le=12)
  sex: SexValue = SexValue.UNKNOWN
  deathDateYear: int | None = Field(default=None, ge=1900, le=2100)
  deathDateMonth: int | None = Field(default=None, ge=1, le=12)
  lastVisitDateYear: int | None = Field(default=None, ge=1900, le=2100)
  lastVisitDateMonth: int | None = Field(default=None, ge=1, le=12)
  lastNewsDateYear: int | None = Field(default=None, ge=1900, le=2100)
  lastNewsDateMonth: int | None = Field(default=None, ge=1, le=12)
  medication: list[MedicationIn] = Field(default_factory=list)
  surgery: list[SurgeryIn] = Field(default_factory=list)
  primaryCancer: list[PrimaryCancerIn] = Field(default_factory=list)
  biologicalSpecimenList: list[BiologicalSpecimenIn] = Field(default_factory=list)
  mesureList: list[MeasureIn] = Field(default_factory=list)


class PatientProfileIn(StrictModel):
  schemaVersion: Literal[1, 2] = 1
  profileVersion: int | None = Field(default=None, ge=0)
  patientId: constr(min_length=1, max_length=120) | None = None
  diagnosis: constr(min_length=1, max_length=500)
  pathologySummary: constr(min_length=1, max_length=8000)
  analyses: list[PatientAnalysisIn] = Field(default_factory=list)
  report: PatientReportIn
  reportMeta: PatientReportMetaIn | None = None
  clinicalData: PatientClinicalDataIn | None = None


class PatientProfileOut(BaseModel):
  patient_id: int
  source: str
  profile: dict[str, Any] | None = None
  profile_version: int | None = None
  stored_schema_version: int | None = None


class ArgosDiscussionCreateIn(BaseModel):
  patient_id: int
  title: str | None = None
  context: str | None = None


class ArgosDiscussionOut(BaseModel):
  id: int
  patient_id: int
  clinician_id: int
  title: str | None
  context: str | None
  status: str
  created_at: str
  updated_at: str


class ArgosMessageSections(BaseModel):
  clinicalSynthesis: str | None = None
  hypotheses: list[str] = []
  arguments: list[str] = []
  nextSteps: list[str] = []
  traceability: str | None = None


class ArgosMessageCreateIn(BaseModel):
  message_type: str  # 'user_query' | 'argos_response' | 'clinician_note'
  content: str
  sections: ArgosMessageSections | None = None


class ArgosMessageOut(BaseModel):
  id: int
  discussion_id: int
  message_type: str
  content: str
  sections: ArgosMessageSections | None = None
  created_at: str
  created_by: int | None


