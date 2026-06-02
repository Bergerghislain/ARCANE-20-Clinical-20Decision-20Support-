from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import JSONB

revision = "001_patient_profiles"
down_revision = "000_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
  bind = op.get_bind()
  insp = inspect(bind)
  if "patient_profiles" in insp.get_table_names():
    return
  op.create_table(
    "patient_profiles",
    sa.Column("patient_id", sa.Integer(), nullable=False),
    sa.Column("profile_data", JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column("profile_version", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.ForeignKeyConstraint(["patient_id"], ["patients.id_patient"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("patient_id"),
  )
  op.create_index("idx_patient_profiles_updated", "patient_profiles", ["updated_at"])


def downgrade() -> None:
  bind = op.get_bind()
  insp = inspect(bind)
  if "patient_profiles" not in insp.get_table_names():
    return
  op.drop_index("idx_patient_profiles_updated", table_name="patient_profiles")
  op.drop_table("patient_profiles")
