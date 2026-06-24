"""Traçabilité des échanges IA (audit clinique — sans fuite de PII complète)."""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from ...settings import settings
from .prompts import PROMPT_VERSION

logger = logging.getLogger("arcane.ai.audit")


def _hash_text(value: str) -> str:
  return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _safe_meta(meta: dict[str, Any]) -> dict[str, Any]:
  """Réduit les métadonnées loggées (pas de profil patient en clair)."""
  out: dict[str, Any] = {}
  for key, value in meta.items():
    if key in ("profile", "profile_json", "chat_history"):
      if value is None:
        out[key] = None
      else:
        try:
          blob = json.dumps(value, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
          blob = str(value)
        out[f"{key}_sha256_prefix"] = _hash_text(blob)
        out[f"{key}_bytes"] = len(blob.encode("utf-8"))
      continue
    if key in ("user_message", "context_message", "patient_name", "patient_mrn"):
      text = str(value or "")
      out[key] = {"sha256_prefix": _hash_text(text), "length": len(text)}
      continue
    out[key] = value
  return out


def log_ai_request(
  *,
  kind: str,
  user_id: int | None,
  meta: dict[str, Any] | None = None,
) -> None:
  payload = {
    "event": "ai_request",
    "kind": kind,
    "user_id": user_id,
    "prompt_version": PROMPT_VERSION,
    "llm_provider": settings.llm_provider,
    "llm_model": settings.llm_model,
  }
  if meta:
    payload["meta"] = _safe_meta(meta)
  logger.info(json.dumps(payload, ensure_ascii=False))


def log_ai_response(
  *,
  kind: str,
  user_id: int | None,
  success: bool,
  detail: str | None = None,
  response_chars: int | None = None,
  latency_ms: float | None = None,
) -> None:
  payload = {
    "event": "ai_response",
    "kind": kind,
    "user_id": user_id,
    "success": success,
    "prompt_version": PROMPT_VERSION,
    "llm_provider": settings.llm_provider,
    "llm_model": settings.llm_model,
  }
  if detail:
    payload["detail"] = detail[:200]
  if response_chars is not None:
    payload["response_chars"] = response_chars
  if latency_ms is not None:
    # Latence de bout en bout de l'appel LLM (observabilite/performance).
    payload["latency_ms"] = round(latency_ms, 1)
  logger.info(json.dumps(payload, ensure_ascii=False))
