from __future__ import annotations

import json
import re
from typing import Any

# Bloc Markdown ```json ... ``` (ou ``` ... ```) parfois renvoye par les LLM.
_FENCE_RE = re.compile(r"```(?:json|JSON)?\s*(.*?)```", re.DOTALL)


def _strip_code_fences(text: str) -> str:
  """Retire un eventuel bloc de code Markdown autour du JSON."""
  match = _FENCE_RE.search(text)
  if match:
    inner = match.group(1).strip()
    if inner:
      return inner
  return text


def extract_json_object(text: str) -> dict[str, Any] | None:
  """Extrait un objet JSON depuis une réponse LLM (tolère du texte autour).

  Tolère également un bloc de code Markdown (```json ... ```).
  """
  if not text:
    return None
  s = _strip_code_fences(text.strip()).strip()
  if not s:
    return None
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
