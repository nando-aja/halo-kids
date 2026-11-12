from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings


def _build_engine():
    """
    Membuat engine koneksi database.

    Untuk MySQL/TiDB:
    - pool_pre_ping : koneksi dites (ping) sebelum dipakai. Koneksi mati
                      karena idle diganti otomatis, bukan menggantung
                      sampai request timeout.
    - pool_recycle  : koneksi lama didaur ulang sebelum diputus server.
    - *_timeout     : koneksi/baca/tulis yang macet gagal dengan cepat.

    Untuk database lain (mis. SQLite saat test) opsi pool khusus MySQL
    tidak dipakai.
    """

    options = {"pool_pre_ping": True}

    if make_url(settings.DATABASE_URL).get_backend_name() == "mysql":
        options.update(
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            connect_args={
                "connect_timeout": settings.DB_CONNECT_TIMEOUT,
                "read_timeout": settings.DB_READ_TIMEOUT,
                "write_timeout": settings.DB_WRITE_TIMEOUT,
            },
        )

    return create_engine(settings.DATABASE_URL, **options)


# Membuat engine koneksi ke database
engine = _build_engine()

# Membuat session yang akan digunakan di setiap request (Dependency)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class untuk semua model tabel kita nanti
Base = declarative_base()
