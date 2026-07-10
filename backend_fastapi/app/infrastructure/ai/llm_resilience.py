"""Retries et circuit-breaker légers pour les appels LLM."""
from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

from ...application.errors import ApplicationError

T = TypeVar("T")

DEFAULT_MAX_RETRIES = 2
DEFAULT_RETRY_BACKOFF_SECONDS = 0.5
DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 3
DEFAULT_CIRCUIT_RECOVERY_SECONDS = 30.0


class LlmCircuitOpenError(RuntimeError):
  """Le circuit-breaker LLM est ouvert (trop d'échecs récents)."""


class LlmCircuitBreaker:
  def __init__(
    self,
    *,
    failure_threshold: int = DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
    recovery_seconds: float = DEFAULT_CIRCUIT_RECOVERY_SECONDS,
  ) -> None:
    self._failure_threshold = max(1, failure_threshold)
    self._recovery_seconds = max(1.0, recovery_seconds)
    self._consecutive_failures = 0
    self._opened_at: float | None = None

  def before_call(self) -> None:
    if self._opened_at is None:
      return
    elapsed = time.monotonic() - self._opened_at
    if elapsed >= self._recovery_seconds:
      self._opened_at = None
      self._consecutive_failures = 0
      return
    raise LlmCircuitOpenError("LLM circuit breaker is open")

  def record_success(self) -> None:
    self._consecutive_failures = 0
    self._opened_at = None

  def record_failure(self) -> None:
    self._consecutive_failures += 1
    if self._consecutive_failures >= self._failure_threshold:
      self._opened_at = time.monotonic()

  def reset(self) -> None:
    self._consecutive_failures = 0
    self._opened_at = None


_llm_circuit = LlmCircuitBreaker()


def get_llm_circuit_breaker() -> LlmCircuitBreaker:
  return _llm_circuit


def call_with_retries(
  operation: Callable[[], T],
  *,
  max_retries: int = DEFAULT_MAX_RETRIES,
  backoff_seconds: float = DEFAULT_RETRY_BACKOFF_SECONDS,
  circuit: LlmCircuitBreaker | None = None,
) -> T:
  breaker = circuit or _llm_circuit
  breaker.before_call()
  attempts = max(0, max_retries) + 1
  last_error: Exception | None = None

  for attempt in range(attempts):
    try:
      result = operation()
      breaker.record_success()
      return result
    except ApplicationError:
      raise
    except Exception as exc:  # noqa: BLE001 — frontière réseau LLM
      last_error = exc
      breaker.record_failure()
      if attempt >= attempts - 1:
        break
      time.sleep(backoff_seconds * (attempt + 1))

  assert last_error is not None
  raise last_error
