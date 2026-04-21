from __future__ import annotations

import json
from typing import Any


def extract_json_object(text: str) -> dict[str, Any] | None:
  """Extrait un objet JSON depuis une réponse LLM (tolère du texte autour)."""
  if not text:
    return None
  s = text.strip()
  # fast path
  if s.startswith("{") and s.endswith("}"):
    try:
      parsed = json.loads(s)
      return parsed if isinstance(parsed, dict) else None
    except Exception:
      pass

  # slow path: find first {...} block
  start = s.find("{")
  end = s.rfind("}")
  if start == -1 or end == -1 or end <= start:
    return None
  candidate = s[start : end + 1]
  try:
    parsed = json.loads(candidate)
    return parsed if isinstance(parsed, dict) else None
  except Exception:
    return None

