
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import (
    admin,
    auth,
    donasi_admin,
    masyarakat,
    panti,
    pengajuan_lksa,
    public,
    upload,
)

from app.core.config import settings
from app.db.database import engine


app = FastAPI(
    title="HaloKids API",
    description=(
        "Backend untuk Sistem Informasi "
        "Pelindungan Anak dan Panti Asuhan"
    ),
    version="1.1.0",
)


# ==========================================
# CORS
# ==========================================

allowed_origins = list(dict.fromkeys([
    *settings.cors_origins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"],
)

app.include_router(
    public.router,
    prefix="/api/public",
    tags=["Public"],
)

app.include_router(
    masyarakat.router,
    prefix="/api/masyarakat",
    tags=["Masyarakat"],
)

app.include_router(
    panti.router,
    prefix="/api/panti",
    tags=["Pengelola Panti"],
)

app.include_router(
    pengajuan_lksa.router,
    prefix="/api/pengajuan-lksa",
    tags=["Pengajuan LKSA"],
)

app.include_router(
    admin.router,
    prefix="/api/admin",
    tags=["Admin Dinsos"],
)

app.include_router(
    donasi_admin.router,
    prefix="/api/admin",
    tags=["Admin Dinsos - Donasi"],
)

app.include_router(
    upload.router,
    prefix="/api/upload",
    tags=["Upload Berkas"],
)


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def read_root():
    return {
        "message": "HaloKids API berhasil berjalan",
        "version": "1.1.0",
        "docs": "/docs",
    }


# ==========================================
# DATABASE CHECK
# ==========================================

@app.get("/cek-db")
def check_db():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "message": "Koneksi MySQL/TiDB berhasil",
        }

    except Exception as exc:
        return {
            "database": "error",
            "message": "Koneksi database gagal",
            "detail": str(exc),
        }
import logging
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import (
    admin,
    auth,
    donasi_admin,
    masyarakat,
    panti,
    pengajuan_lksa,
    public,
    upload,
)

from app.core.config import settings
from app.core.security import hash_password
from app.db.database import engine


# Memakai logger uvicorn agar log INFO/WARNING tampil di Render.
logger = logging.getLogger("uvicorn.error")


def _warm_up() -> None:
    """
    Pemanasan di thread terpisah (tidak menahan server start):

    1. Membuka koneksi database pertama (handshake TLS ke TiDB).
    2. Memuat backend bcrypt sekali, supaya login pertama tidak
       menanggung biaya inisialisasi passlib/bcrypt.
    """

    try:
        started = time.perf_counter()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info(
            "Warm-up DB selesai dalam %.0f ms",
            (time.perf_counter() - started) * 1000,
        )
    except Exception as exc:
        logger.warning("Warm-up DB gagal: %s", exc)

    try:
        started = time.perf_counter()
        hash_password("warm-up")
        logger.info(
            "Warm-up bcrypt selesai dalam %.0f ms",
            (time.perf_counter() - started) * 1000,
        )
    except Exception as exc:
        logger.warning("Warm-up bcrypt gagal: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Jalankan pemanasan di background; server langsung siap menerima request.
    threading.Thread(target=_warm_up, daemon=True).start()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="HaloKids API",
    description=(
        "Backend untuk Sistem Informasi "
        "Pelindungan Anak dan Panti Asuhan"
    ),
    version="1.1.0",
)


# ==========================================
# CORS
# ==========================================

allowed_origins = list(dict.fromkeys([
    *settings.cors_origins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# PENGUKURAN WAKTU REQUEST
# ==========================================

@app.middleware("http")
async def measure_request_time(request: Request, call_next):
    """
    Menambahkan header X-Process-Time-ms pada setiap respons dan
    mencatat request lambat di log. Dipakai untuk audit performa
    (login, query TiDB, endpoint API).
    """

    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000

    response.headers["X-Process-Time-ms"] = f"{elapsed_ms:.0f}"

    if elapsed_ms >= settings.SLOW_REQUEST_MS:
        logger.warning(
            "SLOW %s %s -> %s dalam %.0f ms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )

    return response


# ==========================================
# ROUTERS
# ==========================================

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"],
)

app.include_router(
    public.router,
    prefix="/api/public",
    tags=["Public"],
)

app.include_router(
    masyarakat.router,
    prefix="/api/masyarakat",
    tags=["Masyarakat"],
)

app.include_router(
    panti.router,
    prefix="/api/panti",
    tags=["Pengelola Panti"],
)

app.include_router(
    pengajuan_lksa.router,
    prefix="/api/pengajuan-lksa",
    tags=["Pengajuan LKSA"],
)

app.include_router(
    admin.router,
    prefix="/api/admin",
    tags=["Admin Dinsos"],
)

app.include_router(
    donasi_admin.router,
    prefix="/api/admin",
    tags=["Admin Dinsos - Donasi"],
)

app.include_router(
    upload.router,
    prefix="/api/upload",
    tags=["Upload Berkas"],
)


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def read_root():
    return {
        "message": "HaloKids API berhasil berjalan",
        "version": "1.1.0",
        "docs": "/docs",
    }


# ==========================================
# HEALTH CHECK RINGAN (tanpa database)
# ==========================================

@app.get("/healthz")
def health_check():
    """
    Endpoint ringan untuk uptime monitor / keep-alive agar server
    hosting tidak tertidur (cold start). Tidak mengakses database.
    """
    return {"status": "ok"}


# ==========================================
# DATABASE CHECK
# ==========================================

@app.get("/cek-db")
def check_db():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "message": "Koneksi MySQL/TiDB berhasil",
        }

    except Exception as exc:
        return {
            "database": "error",
            "message": "Koneksi database gagal",
            "detail": str(exc),
        }

