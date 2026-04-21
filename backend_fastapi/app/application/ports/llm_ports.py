from __future__ import annotations

from typing import Any, Protocol


class LlmPort(Protocol):
  def chat(self, messages: list[dict[str, Any]]) -> str: ...

