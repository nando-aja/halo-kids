
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.sql import func

from app.db.database import Base


class DokumenPengajuanLKSA(Base):
    __tablename__ = "dokumen_pengajuan_lksa"

    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True,
    )

    # ==========================================
    # RELASI PENGAJUAN
    # ==========================================

    id_pengajuan = Column(
        Integer,
        ForeignKey("pengajuan_lksa.id"),
        nullable=False,
        index=True,
    )

    # ==========================================
    # INFORMASI DOKUMEN
    # ==========================================

    jenis_dokumen = Column(
        String(80),
        nullable=False,
        index=True,
    )

    label_dokumen = Column(
        String(150),
        nullable=True,
    )

    nama_file_asli = Column(
        String(255),
        nullable=False,
    )

    # ==========================================
    # LOKASI FILE SUPABASE
    # ==========================================

    bucket_name = Column(
        String(50),
        nullable=False,
        default="halokids-private",
        server_default="halokids-private",
    )

    path_file = Column(
        String(500),
        nullable=False,
    )

    mime_type = Column(
        String(100),
        nullable=True,
    )

    ukuran_byte = Column(
        BIGINT(unsigned=True),
        nullable=True,
    )

    # ==========================================
    # VERIFIKASI DOKUMEN
    # ==========================================

    status_verifikasi = Column(
        String(30),
        nullable=False,
        default="menunggu",
        server_default="menunggu",
        index=True,
    )

    hasil_ai = Column(
        JSON,
        nullable=True,
    )

    catatan_verifikasi = Column(
        Text,
        nullable=True,
    )

    # ==========================================
    # RELASI ADMIN VERIFIKATOR
    # ==========================================

    id_admin_verifikator = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    # ==========================================
    # TIMESTAMP
    # ==========================================

    tanggal_upload = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    tanggal_verifikasi = Column(
        DateTime,
        nullable=True,
    )
