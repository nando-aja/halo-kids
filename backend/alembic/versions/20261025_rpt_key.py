"""Add idempotency key for complaint submissions.

Revision ID: 20261025_rpt_key
Revises: 50e66424d641
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261025_rpt_key"
down_revision: Union[str, Sequence[str], None] = "50e66424d641"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("laporan_pengaduan")}
    if "submission_key" not in columns:
        op.add_column(
            "laporan_pengaduan",
            sa.Column("submission_key", sa.String(length=80), nullable=True),
        )

    inspector = sa.inspect(bind)
    indexes = {item.get("name") for item in inspector.get_indexes("laporan_pengaduan") if item.get("name")}
    if "ix_laporan_pengaduan_submission_key" not in indexes:
        op.create_index(
            "ix_laporan_pengaduan_submission_key",
            "laporan_pengaduan",
            ["submission_key"],
            unique=True,
        )


def downgrade() -> None:
    # Sengaja tidak menghapus kolom/index agar data pengiriman tetap aman.
    pass
