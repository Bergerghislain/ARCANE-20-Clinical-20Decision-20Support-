"""Logique pure de limitation des tentatives de connexion (anti-brute-force).

Aucune dependance I/O: la persistance est confiee a un depot via un port.
On modelise l'etat des tentatives par identifiant et on calcule, de facon
deterministe, le nouvel etat apres un echec et le verrouillage eventuel.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class AttemptState:
  fail_count: int = 0
  locked_until: datetime | None = None
  last_attempt_at: datetime | None = None


def is_locked(state: AttemptState | None, now: datetime) -> bool:
  """Vrai si le compte est actuellement verrouille."""
  if state is None or state.locked_until is None:
    return False
  return state.locked_until > now


def seconds_until_unlock(state: AttemptState | None, now: datetime) -> int:
  if not is_locked(state, now):
    return 0
  assert state is not None and state.locked_until is not None
  return max(0, int((state.locked_until - now).total_seconds()))


def register_failure(
  state: AttemptState | None,
  now: datetime,
  *,
  max_attempts: int,
  window_seconds: int,
  lock_seconds: int,
) -> AttemptState:
  """Calcule le nouvel etat apres un echec d'authentification.

  - Si la derniere tentative est plus vieille que la fenetre, le compteur repart a 1.
  - Sinon on incremente.
  - Si le seuil est atteint, on pose un verrou jusqu'a now + lock_seconds et on
    remet le compteur a zero (un nouveau cycle commencera apres expiration).
  """
  previous_count = 0
  if state is not None and state.last_attempt_at is not None:
    within_window = (now - state.last_attempt_at) <= timedelta(seconds=window_seconds)
    if within_window:
      previous_count = state.fail_count

  new_count = previous_count + 1
  if new_count >= max_attempts:
    return AttemptState(
      fail_count=0,
      locked_until=now + timedelta(seconds=lock_seconds),
      last_attempt_at=now,
    )
  return AttemptState(fail_count=new_count, locked_until=None, last_attempt_at=now)
