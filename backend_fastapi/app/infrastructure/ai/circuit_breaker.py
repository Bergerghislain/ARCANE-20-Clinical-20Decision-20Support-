"""Disjoncteur (circuit breaker) minimal pour les appels LLM.

Objectif: eviter de marteler un endpoint LLM en panne. Apres `threshold` echecs
consecutifs (5xx / reseau), le circuit s'ouvre et les appels echouent vite (503)
pendant `reset_seconds`, puis on retente (etat semi-ouvert).
"""
from __future__ import annotations

import time


class CircuitBreaker:
  def __init__(self, threshold: int = 5, reset_seconds: float = 30.0) -> None:
    self.threshold = max(1, int(threshold))
    self.reset_seconds = float(reset_seconds)
    self._failures = 0
    self._opened_at: float | None = None

  def is_open(self) -> bool:
    if self._opened_at is None:
      return False
    # Semi-ouvert: une fois le delai ecoule, on autorise un essai.
    if (time.monotonic() - self._opened_at) >= self.reset_seconds:
      return False
    return True

  def record_success(self) -> None:
    self._failures = 0
    self._opened_at = None

  def record_failure(self) -> None:
    self._failures += 1
    if self._failures >= self.threshold:
      self._opened_at = time.monotonic()

  def reset(self) -> None:
    self._failures = 0
    self._opened_at = None
