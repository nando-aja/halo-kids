from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db.database import Base


class LaporanPengaduanLampiran(Base):
    """Metadata file bukti pengaduan; file asli disimpan di Supabase Storage."""

    __tablename__ = "laporan_pengaduan_lampiran"

    __table_args__ = (
        UniqueConstraint(
            "storage_bucket",
            "storage_path",
            name="uq_laporan_pengaduan_lampiran_storage_object",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    id_laporan = Column(
        Integer,
        ForeignKey(
            "laporan_pengaduan.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    nama_file = Column(
        String(255),
        nullable=False,
    )

    storage_bucket = Column(
        String(100),
        nullable=False,
    )

    storage_path = Column(
        String(512),
        nullable=False,
    )

    mime_type = Column(
        String(100),
        nullable=False,
    )

    ukuran_bytes = Column(
        BigInteger,
        nullable=False,
    )

    dibuat_pada = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )