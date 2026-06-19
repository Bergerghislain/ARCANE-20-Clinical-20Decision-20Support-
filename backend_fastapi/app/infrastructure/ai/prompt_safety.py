"""Garde-fous anti prompt-injection sur le contexte patient et l'historique chat."""
from __future__ import annotations

import re
from typing import Any

_MAX_TEXT_LEN = 8_000
_MAX_PROFILE_DEPTH = 8
_INJECTION_MARKERS = (
  "ignore previous instructions",
  "ignore all previous",
  "disregard previous",
  "system prompt",
  "you are now",
  "new instructions:",
  "override instructions",
  "jailbreak",
)

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _strip_control_chars(text: str) -> str:
  return _CONTROL_CHARS.sub("", text)


def sanitize_untrusted_text(text: str, *, max_len: int = _MAX_TEXT_LEN) -> str:
  """Nettoie une entrée utilisateur ou un champ texte non fiable."""
  if not isinstance(text, str):
    return ""
  cleaned = _strip_control_chars(text.strip())
  lowered = cleaned.lower()
  for marker in _INJECTION_MARKERS:
    if marker in lowered:
      cleaned = re.sub(re.escape(marker), "[filtered]", cleaned, flags=re.IGNORECASE)
  if len(cleaned) > max_len:
    cleaned = cleaned[:max_len] + "…"
  return cleaned


def _sanitize_value(value: Any, depth: int = 0) -> Any:
  if depth > _MAX_PROFILE_DEPTH:
    return "[truncated]"
  if isinstance(value, str):
    return sanitize_untrusted_text(value)
  if isinstance(value, list):
    return [_sanitize_value(item, depth + 1) for item in value[:200]]
  if isinstance(value, dict):
    return {
      str(k)[:120]: _sanitize_value(v, depth + 1)
      for k, v in list(value.items())[:200]
    }
  return value


def sanitize_profile(profile: dict[str, Any] | None) -> dict[str, Any] | None:
  if profile is None:
    return None
  if not isinstance(profile, dict):
    return {}
  return _sanitize_value(profile)  # type: ignore[return-value]


def sanitize_chat_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
  """Conserve uniquement user/assistant avec contenu nettoyé."""
  safe: list[dict[str, str]] = []
  for msg in history[-12:]:
    role = str(msg.get("role") or "").lower()
    if role not in ("user", "assistant"):
      continue
    content = sanitize_untrusted_text(str(msg.get("content") or ""))
    if content:
      safe.append({"role": role, "content": content})
  return safe


def wrap_untrusted_block(label: str, content: str) -> str:
  """Encadre du contenu non fiable pour limiter l'influence sur le system prompt."""
  safe_label = sanitize_untrusted_text(label, max_len=64)
  safe_content = sanitize_untrusted_text(content)
  return (
    f"<untrusted_{safe_label}>\n"
    f"{safe_content}\n"
    f"</untrusted_{safe_label}>"
  )
