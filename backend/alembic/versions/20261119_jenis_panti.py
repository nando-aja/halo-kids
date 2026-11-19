"""Tambah kolom jenis_panti pada panti_asuhan dan pengajuan_lksa.

Revision ID: 20261119_jenis_panti
Revises: 20261113_tenant_panti
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "20261119_jenis_panti"
down_revision: Union[str, Sequence[str], None] = "20261113_tenant_panti"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_JENIS = "Panti Asuhan Anak"


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    # server_default mengisi baris lama otomatis dengan nilai bawaan.
    for table in ("panti_asuhan", "pengajuan_lksa"):
        cols = [c["name"] for c in insp.get_columns(table)]
        if "jenis_panti" not in cols:
            op.add_column(
                table,
                sa.Column(
                    "jenis_panti",
                    sa.String(50),
                    nullable=True,
                    server_default=DEFAULT_JENIS,
                ),
            )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    for table in ("pengajuan_lksa", "panti_asuhan"):
        cols = [c["name"] for c in insp.get_columns(table)]
        if "jenis_panti" in cols:
            op.drop_column(table, "jenis_panti")
