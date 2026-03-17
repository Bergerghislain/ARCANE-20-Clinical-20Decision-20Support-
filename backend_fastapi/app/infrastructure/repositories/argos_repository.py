from __future__ import annotations

from typing import Any

from ...db import execute, fetch_all, fetch_one
from ..db.unit_of_work import DbUnitOfWork


class SqlArgosRepository:
  def patient_exists(self, patient_id: int) -> bool:
    row = fetch_one(
      "SELECT id_patient FROM patients WHERE id_patient = %s",
      (patient_id,),
    )
    return row is not None

  def create_discussion(
    self,
    *,
    patient_id: int,
    clinician_id: int,
    title: str | None,
    context: str | None,
  ) -> dict[str, Any] | None:
    with DbUnitOfWork() as uow:
      cur = uow.cursor
      if cur is None:
        raise RuntimeError("Transaction cursor not initialized")

      cur.execute(
        """
        INSERT INTO argos_discussions (
          patient_id,
          clinician_id,
          title,
          context,
          status
        ) VALUES (%s,%s,%s,%s,'active')
        RETURNING *
        """,
        (patient_id, clinician_id, title or "New Conversation", context),
      )
      row = cur.fetchone()
      if not row:
        return None
      uow.commit()
      return row

  def list_discussions(self, clinician_id: int, patient_id: int | None = None) -> list[dict[str, Any]]:
    if patient_id is not None:
      return fetch_all(
        """
        SELECT *
        FROM argos_discussions
        WHERE clinician_id = %s AND patient_id = %s
        ORDER BY updated_at DESC
        """,
        (clinician_id, patient_id),
      )
    return fetch_all(
      """
      SELECT *
      FROM argos_discussions
      WHERE clinician_id = %s
      ORDER BY updated_at DESC
      """,
      (clinician_id,),
    )

  def find_discussion(self, discussion_id: int, clinician_id: int) -> dict[str, Any] | None:
    return fetch_one(
      """
      SELECT *
      FROM argos_discussions
      WHERE id = %s AND clinician_id = %s
      """,
      (discussion_id, clinician_id),
    )

  def list_messages(self, discussion_id: int) -> list[dict[str, Any]]:
    return fetch_all(
      """
      SELECT *
      FROM argos_messages
      WHERE discussion_id = %s
      ORDER BY created_at ASC
      """,
      (discussion_id,),
    )

  def create_message(
    self,
    *,
    discussion_id: int,
    message_type: str,
    content: str,
    sections: dict[str, Any] | None,
    created_by: int | None,
  ) -> dict[str, Any] | None:
    sections = sections or {}
    with DbUnitOfWork() as uow:
      cur = uow.cursor
      if cur is None:
        raise RuntimeError("Transaction cursor not initialized")

      cur.execute(
        """
        INSERT INTO argos_messages (
          discussion_id,
          message_type,
          content,
          clinical_summary,
          hypotheses_options,
          arguments,
          next_steps,
          traceability,
          metadata,
          created_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING *
        """,
        (
          discussion_id,
          message_type,
          content,
          sections.get("clinicalSynthesis"),
          sections.get("hypotheses"),
          sections.get("arguments"),
          sections.get("nextSteps"),
          sections.get("traceability"),
          None,
          created_by,
        ),
      )
      row = cur.fetchone()
      if not row:
        return None

      cur.execute(
        "UPDATE argos_discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (discussion_id,),
      )

      uow.commit()
      return row


class SqlActivityLogRepository:
  def write(
    self,
    *,
    user_id: int,
    action_type: str,
    resource_type: str,
    resource_id: int,
    details: dict[str, Any] | None,
    ip_address: str | None,
    user_agent: str | None,
  ) -> None:
    execute(
      """
      INSERT INTO activity_logs (
        user_id, action_type, resource_type, resource_id, details, ip_address, user_agent
      ) VALUES (%s,%s,%s,%s,%s,%s,%s)
      """,
      (
        user_id,
        action_type,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
      ),
    )

