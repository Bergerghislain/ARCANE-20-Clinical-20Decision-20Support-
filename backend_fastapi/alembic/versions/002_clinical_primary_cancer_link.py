"""Lie chirurgie, radiotherapie et imagerie a un cancer primitif (optionnel)."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "002_clinical_primary_cancer_link"
down_revision = "001_patient_profiles"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
  bind = op.get_bind()
  insp = inspect(bind)
  return column in {col["name"] for col in insp.get_columns(table)}


def upgrade() -> None:
  for table in ("surgeries", "radiotherapies", "imaging_studies"):
    if not _has_column(table, "primary_cancer_id"):
      op.add_column(
        table,
        sa.Column("primary_cancer_id", sa.Integer(), nullable=True),
      )
      op.create_foreign_key(
        f"fk_{table}_primary_cancer_id",
        table,
        "primary_cancers",
        ["primary_cancer_id"],
        ["id"],
        ondelete="SET NULL",
      )
      op.create_index(
        f"idx_{table}_primary_cancer_id",
        table,
        ["primary_cancer_id"],
      )


def downgrade() -> None:
  for table in ("imaging_studies", "radiotherapies", "surgeries"):
    if _has_column(table, "primary_cancer_id"):
      op.drop_index(f"idx_{table}_primary_cancer_id", table_name=table)
      op.drop_constraint(f"fk_{table}_primary_cancer_id", table, type_="foreignkey")
      op.drop_column(table, "primary_cancer_id")
