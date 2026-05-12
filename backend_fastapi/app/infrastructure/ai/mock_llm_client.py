from __future__ import annotations

import json
from typing import Any

from ...application.errors import ApplicationError


class MockJsonLlmClient:
  """Reponses JSON deterministes sans serveur LLM (labo, CI, demos).

  Configurez `LLM_PROVIDER=mock_json`. Pour un modele reel (vLLM, etc.),
  utilisez `LLM_PROVIDER=openai_compatible`.
  """

  def chat(self, messages: list[dict[str, Any]]) -> str:
    sys_blob = " ".join(
      str(m.get("content") or "")
      for m in messages
      if str(m.get("role") or "").lower() == "system"
    ).lower()
    if "tu es argos" in sys_blob:
      return json.dumps(
        {
          "content": (
            "Reponse ARGOS simulee (mock_json). "
            "Passez a openai_compatible + LLM_BASE_URL pour une generation reelle."
          ),
          "sections": None,
        },
        ensure_ascii=False,
      )
    return json.dumps(
      {
        "conclusion": (
          "Conclusion simulee (mock_json). "
          "Configurez openai_compatible pour un rapport genere par LLM."
        ),
        "reasoning": "Raisonnement de demonstration sans appel reseau.",
        "sources": ["ARCANE / mock_json"],
      },
      ensure_ascii=False,
    )
