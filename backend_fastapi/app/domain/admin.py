from __future__ import annotations

from enum import StrEnum


class AdminListStatus(StrEnum):
  EN_ATTENTE = "EN_ATTENTE"
  ACTIF = "ACTIF"
  REJETE = "REJETE"


class ValidationAction(StrEnum):
  APPROVE = "APPROVE"
  REJECT = "REJECT"

