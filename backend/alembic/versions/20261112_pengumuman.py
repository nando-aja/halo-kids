"""Create public announcements table (pengumuman).

Revision ID: 20261112_pengumuman
Revises: 20261025_audit
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261112_pengumuman"
down_revision: Union[str, Sequence[str], None] = "20261025_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pengumuman",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("judul", sa.String(150), nullable=False),
        sa.Column("pesan", sa.String(500), nullable=False),
        sa.Column(
            "kategori",
            sa.String(30),
            nullable=False,
            server_default="pengumuman",
        ),
        sa.Column(
            "id_panti",
            sa.Integer(),
            sa.ForeignKey("panti_asuhan.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "id_pembuat",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "aktif",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "tanggal_buat",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_pengumuman_id", "pengumuman", ["id"])
    op.create_index("ix_pengumuman_kategori", "pengumuman", ["kategori"])
    op.create_index("ix_pengumuman_aktif", "pengumuman", ["aktif"])


def downgrade() -> None:
    op.drop_index("ix_pengumuman_aktif", table_name="pengumuman")
    op.drop_index("ix_pengumuman_kategori", table_name="pengumuman")
    op.drop_index("ix_pengumuman_id", table_name="pengumuman")
    op.drop_table("pengumuman")
