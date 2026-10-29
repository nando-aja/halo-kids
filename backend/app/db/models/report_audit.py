
"""Audit trail tindakan terhadap laporan pengaduan HaloKids."""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from app.db.database import Base


class AuditLogPengaduan(Base):
    __tablename__ = "audit_log_pengaduan"

    id = Column(Integer, primary_key=True, autoincrement=True)

    id_laporan = Column(
        Integer,
        ForeignKey("laporan_pengaduan.id"),
        nullable=False,
        index=True,
    )

    # Boleh NULL untuk tindakan pelapor anonim.
    # Nama dan peran tetap disimpan sebagai snapshot audit.
    id_aktor = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    nama_aktor = Column(String(150), nullable=False)
    peran_aktor = Column(String(50), nullable=False)

    # Contoh: laporan_dibuat, lampiran_dilihat, status_diubah.
    aksi = Column(String(60), nullable=False)

    status_sebelum = Column(String(30), nullable=True)
    status_sesudah = Column(String(30), nullable=True)

    waktu = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
