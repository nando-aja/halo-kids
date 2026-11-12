
from sqlalchemy import (
    Column,
    Integer,
    String,
    SmallInteger,
    Text,
    ForeignKey,
    DateTime,
)
from sqlalchemy.sql import func
from sqlalchemy.schema import FetchedValue

from app.db.database import Base


class PengajuanLKSA(Base):
    __tablename__ = "pengajuan_lksa"

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
    # RELASI PENGGUNA DAN PANTI
    # ==========================================

    id_pengelola = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    id_panti = Column(
        Integer,
        ForeignKey("panti_asuhan.id"),
        nullable=True,
        index=True,
    )

    # ==========================================
    # IDENTITAS LKSA
    # ==========================================

    nama_panti = Column(
        String(150),
        nullable=False,
    )

    bentuk_lembaga = Column(
        String(30),
        nullable=False,
    )

    tahun_berdiri = Column(
        SmallInteger,
        nullable=True,
    )

    alamat = Column(
        Text,
        nullable=False,
    )

    kontak = Column(
        String(50),
        nullable=True,
    )

    email_lembaga = Column(
        String(150),
        nullable=True,
    )

    jumlah_anak_asuh = Column(
        Integer,
        nullable=True,
    )

    deskripsi = Column(
        Text,
        nullable=True,
    )

    # ==========================================
    # STATUS PENGAJUAN
    # ==========================================

    status_pengajuan = Column(
        String(30),
        nullable=False,
        default="draft",
        server_default="draft",
        index=True,
    )

    catatan_admin = Column(
        Text,
        nullable=True,
    )

    # ==========================================
    # VERIFIKATOR ADMIN
    # ==========================================

    id_admin_verifikator = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    tanggal_diajukan = Column(
        DateTime,
        nullable=True,
    )

    tanggal_verifikasi = Column(
        DateTime,
        nullable=True,
    )

    # ==========================================
    # TIMESTAMP
    # ==========================================

    tanggal_dibuat = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    tanggal_diperbarui = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        server_onupdate=FetchedValue(),
    )
