from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum
)

from sqlalchemy.sql import func

from app.db.database import Base


class LaporanPengaduan(Base):
    __tablename__ = "laporan_pengaduan"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    id_user = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    kode_tiket = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    # Kunci idempotensi dari frontend agar retry/double-submit tidak membuat
    # laporan dan notifikasi baru untuk request pengiriman yang sama.
    submission_key = Column(
        String(80),
        unique=True,
        nullable=True,
        index=True,
    )

    isi_laporan = Column(
        Text,
        nullable=False
    )

    jenis_laporan = Column(
        String(100),
        nullable=False
    )

    status = Column(
        Enum(
            "baru",
            "diproses",
            "selesai",
            name="status_laporan"
        ),
        default="baru",
        nullable=False
    )

    tanggal_lapor = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )