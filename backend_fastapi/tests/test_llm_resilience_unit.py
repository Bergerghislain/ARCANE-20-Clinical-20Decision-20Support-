from __future__ import annotations

import pytest

from backend_fastapi.app.infrastructure.ai.llm_resilience import (
  LlmCircuitBreaker,
  LlmCircuitOpenError,
  call_with_retries,
)


def test_call_with_retries_succeeds_after_transient_failure():
  attempts = {"n": 0}

  def flaky() -> str:
    attempts["n"] += 1
    if attempts["n"] < 2:
      raise RuntimeError("temporary")
    return "ok"

  assert call_with_retries(flaky, max_retries=2, circuit=LlmCircuitBreaker()) == "ok"
  assert attempts["n"] == 2


def test_circuit_breaker_opens_after_threshold():
  breaker = LlmCircuitBreaker(failure_threshold=2, recovery_seconds=60)

  def fail() -> None:
    raise RuntimeError("x")

  with pytest.raises(RuntimeError):
    call_with_retries(fail, max_retries=0, circuit=breaker)
  with pytest.raises(RuntimeError):
    call_with_retries(fail, max_retries=0, circuit=breaker)

  with pytest.raises(LlmCircuitOpenError):
    breaker.before_call()
