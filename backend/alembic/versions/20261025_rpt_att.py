"""Create table for complaint attachments metadata.

Revision ID: 20261025_rpt_att
Revises: 20261025_rpt_key
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic.
revision: str = "20261025_rpt_att"
down_revision: Union[str, Sequence[str], None] = "20261025_rpt_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create metadata table for private complaint attachments."""

    op.create_table(
        "laporan_pengaduan_lampiran",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "id_laporan",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "nama_file",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "storage_bucket",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "storage_path",
            sa.String(length=512),
            nullable=False,
        ),
        sa.Column(
            "mime_type",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "ukuran_bytes",
            sa.BigInteger(),
            nullable=False,
        ),
        sa.Column(
            "dibuat_pada",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["id_laporan"],
            ["laporan_pengaduan.id"],
            name="fk_laporan_pengaduan_lampiran_laporan",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "storage_bucket",
            "storage_path",
            name="uq_laporan_pengaduan_lampiran_storage_object",
        ),
    )

    op.create_index(
        "ix_laporan_pengaduan_lampiran_id_laporan",
        "laporan_pengaduan_lampiran",
        ["id_laporan"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the attachment metadata table."""

    op.drop_index(
        "ix_laporan_pengaduan_lampiran_id_laporan",
        table_name="laporan_pengaduan_lampiran",
    )
    op.drop_table("laporan_pengaduan_lampiran")