"""Pisahkan data per panti: anak_asuh dan pengajuan_adopsi.id_panti.

Revision ID: 20261113_tenant_panti
Revises: 20261112_pengumuman
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261113_tenant_panti"
down_revision: Union[str, Sequence[str], None] = "20261112_pengumuman"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "anak_asuh",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "id_panti",
            sa.Integer(),
            sa.ForeignKey("panti_asuhan.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nama", sa.String(150), nullable=False),
        sa.Column("usia", sa.Integer(), nullable=True),
        sa.Column("jenis_kelamin", sa.String(20), nullable=True),
        sa.Column("status_kesejahteraan", sa.String(50), nullable=True),
        sa.Column("pendidikan", sa.String(100), nullable=True),
        sa.Column("kondisi_kesehatan", sa.String(100), nullable=True),
        sa.Column("tanggal_masuk", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_anak_asuh_id", "anak_asuh", ["id"])
    op.create_index("ix_anak_asuh_id_panti", "anak_asuh", ["id_panti"])

    # Pengajuan lama dibiarkan NULL: hanya Dinsos yang melihatnya,
    # tidak ada panti yang ikut melihat berkas pemohon lama.
    op.add_column(
        "pengajuan_adopsi",
        sa.Column("id_panti", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_pengajuan_adopsi_id_panti",
        "pengajuan_adopsi",
        "panti_asuhan",
        ["id_panti"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_pengajuan_adopsi_id_panti", "pengajuan_adopsi", ["id_panti"]
    )


def downgrade() -> None:
    op.drop_index("ix_pengajuan_adopsi_id_panti", table_name="pengajuan_adopsi")
    op.drop_constraint(
        "fk_pengajuan_adopsi_id_panti", "pengajuan_adopsi", type_="foreignkey"
    )
    op.drop_column("pengajuan_adopsi", "id_panti")

    op.drop_index("ix_anak_asuh_id_panti", table_name="anak_asuh")
    op.drop_index("ix_anak_asuh_id", table_name="anak_asuh")
    op.drop_table("anak_asuh")