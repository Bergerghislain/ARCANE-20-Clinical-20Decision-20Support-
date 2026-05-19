from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from ..errors import ApplicationError
from ..ports.llm_ports import LlmSsePort


class StreamLlmSseUseCase:
  """Flux SSE LLM : port injecte (tests avec fake sans toucher settings globaux)."""

  def __init__(self, llm_sse: LlmSsePort | None) -> None:
    self._llm_sse = llm_sse

  def iter_events(self, messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    if self._llm_sse is None:
      raise ApplicationError("LLM provider is disabled.", 503)
    return self._llm_sse.stream_sse(messages)
