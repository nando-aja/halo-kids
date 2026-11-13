from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from app.db.database import Base


class AnakAsuh(Base):
    """
    Anak asuh milik SATU panti. Setiap baris wajib terhubung ke
    panti_asuhan.id; semua endpoint selalu memfilter dengan id_panti
    milik pengelola yang sedang login (multi-tenant).
    """

    __tablename__ = "anak_asuh"

    id = Column(Integer, primary_key=True, index=True)

    id_panti = Column(
        Integer,
        ForeignKey("panti_asuhan.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    nama = Column(String(150), nullable=False)
    usia = Column(Integer, nullable=True)
    jenis_kelamin = Column(String(20), nullable=True)
    status_kesejahteraan = Column(String(50), nullable=True)
    pendidikan = Column(String(100), nullable=True)
    kondisi_kesehatan = Column(String(100), nullable=True)
    tanggal_masuk = Column(Date, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
