from __future__ import annotations

from backend_fastapi.app.infrastructure.ai.prompts import build_argos_messages, build_report_messages


def test_build_report_messages_returns_system_and_user_json_string():
  msgs = build_report_messages(patient_name="A", patient_mrn=None, profile={"k": "v"})
  assert len(msgs) == 2
  assert msgs[0]["role"] == "system"
  assert "JSON valide" in msgs[0]["content"]
  assert msgs[1]["role"] == "user"
  assert '"patient"' in msgs[1]["content"]


def test_build_argos_messages_filters_history_roles_and_limits_to_last_12():
  history = [{"role": "user", "content": f"m{i}"} for i in range(20)]
  history.insert(0, {"role": "weird", "content": "skip"})
  msgs = build_argos_messages(
    patient_name=None,
    patient_mrn=None,
    context_message=None,
    profile=None,
    user_message="hi",
    history=history,
  )
  # system + last 12 user messages + final user payload
  assert msgs[0]["role"] == "system"
  assert msgs[-1]["role"] == "user"
  assert len([m for m in msgs if m["role"] == "user" and m["content"].startswith("m")]) == 12

