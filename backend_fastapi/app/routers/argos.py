from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..db import fetch_all, fetch_one, get_conn_tx, execute
from ..deps import ClinicianUser
from ..schemas import (
  ArgosDiscussionCreateIn,
  ArgosDiscussionOut,
  ArgosMessageCreateIn,
  ArgosMessageOut,
  ArgosMessageSections,
)


router = APIRouter(prefix="/api/argos", tags=["argos"])


def _row_to_discussion(row: dict[str, Any]) -> ArgosDiscussionOut:
  return ArgosDiscussionOut(
    id=int(row["id"]),
    patient_id=int(row["patient_id"]),
    clinician_id=int(row["clinician_id"]),
    title=row.get("title"),
    context=row.get("context"),
    status=row.get("status") or "active",
    created_at=row["created_at"].isoformat() if row.get("created_at") else "",
    updated_at=row["updated_at"].isoformat() if row.get("updated_at") else "",
  )


def _row_to_sections(row: dict[str, Any]) -> ArgosMessageSections | None:
  if not any(
    [
      row.get("clinical_summary"),
      row.get("hypotheses_options"),
      row.get("arguments"),
      row.get("next_steps"),
      row.get("traceability"),
    ]
  ):
    return None

  hypotheses_raw = row.get("hypotheses_options") or []
  arguments_raw = row.get("arguments") or []
  next_steps_raw = row.get("next_steps") or []

  return ArgosMessageSections(
    clinicalSynthesis=row.get("clinical_summary"),
    hypotheses=list(hypotheses_raw),
    arguments=list(arguments_raw),
    nextSteps=list(next_steps_raw),
    traceability=row.get("traceability"),
  )


def _row_to_message(row: dict[str, Any]) -> ArgosMessageOut:
  return ArgosMessageOut(
    id=int(row["id"]),
    discussion_id=int(row["discussion_id"]),
    message_type=str(row["message_type"]),
    content=str(row["content"]),
    sections=_row_to_sections(row),
    created_at=row["created_at"].isoformat() if row.get("created_at") else "",
    created_by=int(row["created_by"]) if row.get("created_by") is not None else None,
  )


def _log_activity(
  request: Request,
  user: CurrentUser,
  action_type: str,
  resource_type: str,
  resource_id: int,
  details: dict[str, Any] | None = None,
) -> None:
  ip = request.client.host if request.client else None
  user_agent = request.headers.get("user-agent")
  execute(
    """
    INSERT INTO activity_logs (
      user_id, action_type, resource_type, resource_id, details, ip_address, user_agent
    ) VALUES (%s,%s,%s,%s,%s,%s,%s)
    """,
    (
      int(user["id"]),
      action_type,
      resource_type,
      resource_id,
      details,
      ip,
      user_agent,
    ),
  )


@router.post("/discussions", response_model=ArgosDiscussionOut, status_code=status.HTTP_201_CREATED)
def create_discussion(
  payload: ArgosDiscussionCreateIn,
  request: Request,
  user: ClinicianUser,
) -> ArgosDiscussionOut:
  # Vérifier que le patient existe
  patient = fetch_one(
    "SELECT id_patient FROM patients WHERE id_patient = %s",
    (payload.patient_id,),
  )
  if not patient:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

  conn = get_conn_tx()
  try:
    cur = conn.cursor()
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
      (
        payload.patient_id,
        int(user["id"]),
        payload.title or "New Conversation",
        payload.context,
      ),
    )
    row = cur.fetchone()
    if not row:
      raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create discussion",
      )
    discussion = _row_to_discussion(row)
    conn.commit()

    _log_activity(
      request,
      user,
      action_type="argos_discussion_created",
      resource_type="argos_discussion",
      resource_id=discussion.id,
      details={"patient_id": discussion.patient_id},
    )

    return discussion
  except Exception as exc:
    conn.rollback()
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Failed to create discussion: {exc}",
    )
  finally:
    conn.close()


@router.get("/discussions", response_model=list[ArgosDiscussionOut])
def list_discussions(
  user: ClinicianUser,
  patient_id: int | None = None,
) -> list[ArgosDiscussionOut]:
  if patient_id is not None:
    rows = fetch_all(
      """
      SELECT *
      FROM argos_discussions
      WHERE clinician_id = %s AND patient_id = %s
      ORDER BY updated_at DESC
      """,
      (int(user["id"]), patient_id),
    )
  else:
    rows = fetch_all(
      """
      SELECT *
      FROM argos_discussions
      WHERE clinician_id = %s
      ORDER BY updated_at DESC
      """,
      (int(user["id"]),),
    )
  return [_row_to_discussion(r) for r in rows]


@router.get("/discussions/{discussion_id}", response_model=ArgosDiscussionOut)
def get_discussion(discussion_id: int, user: ClinicianUser) -> ArgosDiscussionOut:
  row = fetch_one(
    """
    SELECT *
    FROM argos_discussions
    WHERE id = %s AND clinician_id = %s
    """,
    (discussion_id, int(user["id"])),
  )
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")
  return _row_to_discussion(row)


@router.get("/discussions/{discussion_id}/messages", response_model=list[ArgosMessageOut])
def list_messages(discussion_id: int, user: ClinicianUser) -> list[ArgosMessageOut]:
  # Vérifier que la discussion appartient bien au clinicien
  discussion = fetch_one(
    """
    SELECT id
    FROM argos_discussions
    WHERE id = %s AND clinician_id = %s
    """,
    (discussion_id, int(user["id"])),
  )
  if not discussion:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")

  rows = fetch_all(
    """
    SELECT *
    FROM argos_messages
    WHERE discussion_id = %s
    ORDER BY created_at ASC
    """,
    (discussion_id,),
  )
  return [_row_to_message(r) for r in rows]


@router.post(
  "/discussions/{discussion_id}/messages",
  response_model=ArgosMessageOut,
  status_code=status.HTTP_201_CREATED,
)
def add_message(
  discussion_id: int,
  payload: ArgosMessageCreateIn,
  request: Request,
  user: ClinicianUser,
) -> ArgosMessageOut:
  # Vérifier que la discussion appartient bien au clinicien
  discussion = fetch_one(
    """
    SELECT id, patient_id
    FROM argos_discussions
    WHERE id = %s AND clinician_id = %s
    """,
    (discussion_id, int(user["id"])),
  )
  if not discussion:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")

  sections = payload.sections
  clinical_summary = sections.clinicalSynthesis if sections else None
  hypotheses = sections.hypotheses if sections else None
  arguments = sections.arguments if sections else None
  next_steps = sections.nextSteps if sections else None
  traceability = sections.traceability if sections else None

  # Par défaut, on associe created_by à l'utilisateur, sauf pour certains types
  created_by = int(user["id"])
  if payload.message_type == "argos_response":
    created_by = None

  conn = get_conn_tx()
  try:
    cur = conn.cursor()
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
        payload.message_type,
        payload.content,
        clinical_summary,
        hypotheses,
        arguments,
        next_steps,
        traceability,
        None,
        created_by,
      ),
    )
    row = cur.fetchone()
    if not row:
      raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create message",
      )

    # Mettre à jour updated_at de la discussion
    cur.execute(
      "UPDATE argos_discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
      (discussion_id,),
    )

    conn.commit()
    message = _row_to_message(row)

    _log_activity(
      request,
      user,
      action_type="argos_message_created",
      resource_type="argos_message",
      resource_id=message.id,
      details={"discussion_id": discussion_id, "message_type": payload.message_type},
    )

    return message
  except Exception as exc:
    conn.rollback()
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Failed to create message: {exc}",
    )
  finally:
    conn.close()

