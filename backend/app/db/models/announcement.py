from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from app.db.database import Base


class Pengumuman(Base):
    """
    Pengumuman PUBLIK (tanpa penerima tertentu).

    Berbeda dengan tabel `notifikasi` yang selalu milik satu akun
    (id_user), pengumuman dapat dibaca siapa saja, termasuk pengunjung
    yang belum login: pembaruan web, panti baru terverifikasi, dan
    informasi umum lain.
    """

    __tablename__ = "pengumuman"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    judul = Column(
        String(150),
        nullable=False,
    )

    pesan = Column(
        String(500),
        nullable=False,
    )

    # pembaruan | panti_baru | pengumuman
    kategori = Column(
        String(30),
        nullable=False,
        default="pengumuman",
        server_default="pengumuman",
        index=True,
    )

    # Terisi untuk pengumuman "panti_baru".
    id_panti = Column(
        Integer,
        ForeignKey("panti_asuhan.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Admin yang membuat. Kosong untuk pengumuman otomatis sistem.
    id_pembuat = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Pengumuman tidak dihapus permanen, hanya dinonaktifkan.
    aktif = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        index=True,
    )

    tanggal_buat = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
