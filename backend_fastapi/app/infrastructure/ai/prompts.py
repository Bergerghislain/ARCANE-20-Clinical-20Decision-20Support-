from __future__ import annotations

import json
from typing import Any


def _safe_json(obj: Any) -> str:
  return json.dumps(obj, ensure_ascii=False, indent=2)


def build_report_messages(*, patient_name: str, patient_mrn: str | None, profile: dict[str, Any]):
  system = (
    "Tu es un assistant clinique (aide à la décision). "
    "Tu DOIS répondre uniquement en JSON valide, sans texte autour. "
    "Langue: français."
  )
  user = {
    "task": "Générer un rapport clinique structuré.",
    "patient": {"name": patient_name, "mrn": patient_mrn},
    "profile_json": profile,
    "output_format": {
      "conclusion": "string (conclusion clinique synthétique)",
      "reasoning": "string (raisonnement clinique détaillé, naturel, sans liste numérotée)",
      "sources": ["string (sources / références / guidelines / mots-clés de recherche)"],
    },
    "constraints": [
      "Ne pas inventer de faits absents du JSON.",
      "Si une info manque, le signaler explicitement dans le reasoning.",
      "Sources: si aucune source explicite n'est disponible, fournir des sources génériques (guidelines, recommandations) sous forme de titres.",
      "Style: phrases courtes, paragraphes. Eviter les listes numérotées (1., 2., 3.).",
      "Longueur: aller à l'essentiel (réponse courte mais utile).",
    ],
  }
  return [
    {"role": "system", "content": system},
    {"role": "user", "content": _safe_json(user)},
  ]


def build_argos_messages(
  *,
  patient_name: str | None,
  patient_mrn: str | None,
  context_message: str | None,
  profile: dict[str, Any] | None,
  user_message: str,
  history: list[dict[str, Any]],
):
  system = (
    "Tu es ARGOS, assistant d'aide à la décision clinique. "
    "Tu DOIS répondre uniquement en JSON valide, sans texte autour. "
    "Langue: français. Style: naturel, conversationnel."
  )
  user_payload = {
    "patient": {"name": patient_name, "mrn": patient_mrn},
    "context_message": context_message,
    "profile_json": profile,
    "chat_history": history,
    "user_message": user_message,
    "output_format": {
      "content": "string (phrase courte qui introduit l'analyse)",
      "sections": {
        "clinicalSynthesis": "string",
        "hypotheses": ["string"],
        "arguments": ["string"],
        "nextSteps": ["string"],
        "traceability": "string",
      },
    },
    "constraints": [
      "Ne pas inventer de faits absents du JSON.",
      "Rester prudent (support décisionnel, pas de prescription).",
      "Donner des hypothèses et étapes actionnables.",
      "Style: éviter les listes numérotées. Préférer des paragraphes et, si besoin, des puces courtes.",
      "Concision: réponse utile et directe (éviter les longs pavés).",
    ],
  }
  messages = [{"role": "system", "content": system}]
  # history is expected as OpenAI-like messages: {role, content}
  for msg in history[-12:]:
    role = str(msg.get("role") or "")
    if role not in ("user", "assistant", "system"):
      continue
    content = str(msg.get("content") or "")
    if content:
      messages.append({"role": role, "content": content})
  messages.append({"role": "user", "content": _safe_json(user_payload)})
  return messages

