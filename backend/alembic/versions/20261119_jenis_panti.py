"""Tambah kolom jenis_panti pada panti_asuhan.

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


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c["name"] for c in insp.get_columns("panti_asuhan")]
    if "jenis_panti" not in cols:
        op.add_column(
            "panti_asuhan",
            sa.Column("jenis_panti", sa.String(50), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c["name"] for c in insp.get_columns("panti_asuhan")]
    if "jenis_panti" in cols:
        op.drop_column("panti_asuhan", "jenis_panti")
