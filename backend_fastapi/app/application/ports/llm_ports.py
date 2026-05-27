from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any, Protocol


class LlmPort(Protocol):
  def chat(self, messages: list[dict[str, Any]]) -> str: ...


class LlmSsePort(Protocol):
  """Flux SSE compatible client (report / ARGOS)."""

  def stream_sse(self, messages: list[dict[str, Any]]) -> AsyncIterator[str]: ...

