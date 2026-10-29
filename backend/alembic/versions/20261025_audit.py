
"""Create audit trail table for complaint handling.

Revision ID: 20261025_audit
Revises: 20261025_rpt_att
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261025_audit"
down_revision: Union[str, Sequence[str], None] = "20261025_rpt_att"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_log_pengaduan",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("id_laporan", sa.Integer(), nullable=False),
        sa.Column("id_aktor", sa.Integer(), nullable=True),
        sa.Column("nama_aktor", sa.String(150), nullable=False),
        sa.Column("peran_aktor", sa.String(50), nullable=False),
        sa.Column("aksi", sa.String(60), nullable=False),
        sa.Column("status_sebelum", sa.String(30), nullable=True),
        sa.Column("status_sesudah", sa.String(30), nullable=True),
        sa.Column(
            "waktu",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["id_laporan"],
            ["laporan_pengaduan.id"],
            name="fk_audit_log_pengaduan_laporan",
        ),
        sa.ForeignKeyConstraint(
            ["id_aktor"],
            ["users.id"],
            name="fk_audit_log_pengaduan_aktor",
            ondelete="SET NULL",
        ),
    )

    op.create_index(
        "ix_audit_log_pengaduan_id_laporan",
        "audit_log_pengaduan",
        ["id_laporan"],
        unique=False,
    )
    op.create_index(
        "ix_audit_log_pengaduan_id_aktor",
        "audit_log_pengaduan",
        ["id_aktor"],
        unique=False,
    )
    op.create_index(
        "ix_audit_log_pengaduan_waktu",
        "audit_log_pengaduan",
        ["waktu"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_audit_log_pengaduan_waktu",
        table_name="audit_log_pengaduan",
    )
    op.drop_index(
        "ix_audit_log_pengaduan_id_aktor",
        table_name="audit_log_pengaduan",
    )
    op.drop_index(
        "ix_audit_log_pengaduan_id_laporan",
        table_name="audit_log_pengaduan",
    )
    op.drop_table("audit_log_pengaduan")
