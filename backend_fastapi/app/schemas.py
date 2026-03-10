from __future__ import annotations

from pydantic import BaseModel


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


class PatientCreateIn(BaseModel):
  name: str | None = None
  ipp: str | None = None
  condition: str | None = None
  status: str | None = None
  birth_date_year: int | None = None
  birth_date_month: int | None = None
  birth_date_day: int | None = None
  sex: str | None = None
  health_info: dict | None = None


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


