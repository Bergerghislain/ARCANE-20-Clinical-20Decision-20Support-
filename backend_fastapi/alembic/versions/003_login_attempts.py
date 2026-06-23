"""Table login_attempts: anti-brute-force (verrouillage temporaire de compte au login)."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "003_login_attempts"
down_revision = "002_clinical_primary_cancer_link"
branch_labels = None
depends_on = None


def _has_table(table: str) -> bool:
  bind = op.get_bind()
  return table in inspect(bind).get_table_names()


def upgrade() -> None:
  if _has_table("login_attempts"):
    return
  op.create_table(
    "login_attempts",
    sa.Column("identifier", sa.Text(), primary_key=True),
    sa.Column("fail_count", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
  )


def downgrade() -> None:
  if _has_table("login_attempts"):
    op.drop_table("login_attempts")
