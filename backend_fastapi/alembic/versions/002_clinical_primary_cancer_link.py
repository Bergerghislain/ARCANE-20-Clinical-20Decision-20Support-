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


def _has_index(table: str, index: str) -> bool:
  bind = op.get_bind()
  insp = inspect(bind)
  return index in {ix["name"] for ix in insp.get_indexes(table)}


def _has_fk(table: str, constraint: str) -> bool:
  bind = op.get_bind()
  insp = inspect(bind)
  return constraint in {fk["name"] for fk in insp.get_foreign_keys(table)}


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
  # Idempotent : si la colonne a été créée hors Alembic (setup_database.sql),
  # l'index/FK nommés par cette migration peuvent ne pas exister. On vérifie
  # leur présence avant suppression pour garder downgrade -1 reversible en CI.
  for table in ("imaging_studies", "radiotherapies", "surgeries"):
    if not _has_column(table, "primary_cancer_id"):
      continue
    if _has_index(table, f"idx_{table}_primary_cancer_id"):
      op.drop_index(f"idx_{table}_primary_cancer_id", table_name=table)
    if _has_fk(table, f"fk_{table}_primary_cancer_id"):
      op.drop_constraint(f"fk_{table}_primary_cancer_id", table, type_="foreignkey")
    op.drop_column(table, "primary_cancer_id")
