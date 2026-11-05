from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import (
    admin,
    auth,
    donasi_admin,
    masyarakat,
    panti,
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
    version="1.0.0",
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
    admin.router,
    prefix="/api/admin",
    tags=["Admin Dinsos"],
)

# Router daftar donasi khusus admin
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
            "message": "Koneksi MySQL berhasil",
        }

    except Exception as exc:

        return {
            "database": "error",
            "message": "Koneksi MySQL gagal",
            "detail": str(exc),
        }