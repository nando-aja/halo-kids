
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


BentukLembaga = Literal[
    "berbadan_hukum",
    "tidak_berbadan_hukum",
]

StatusPengajuan = Literal[
    "draft",
    "diajukan",
    "ditinjau",
    "menunggu_tinjauan_manual",
    "perlu_perbaikan",
    "disetujui",
    "ditolak",
]

StatusDokumen = Literal[
    "menunggu",
    "valid",
    "tidak_valid",
    "perlu_perbaikan",
]


# ==========================================
# DATA PENGAJUAN
# ==========================================

class PengajuanLKSACreate(BaseModel):
    nama_panti: str = Field(min_length=2, max_length=150)

    bentuk_lembaga: BentukLembaga

    tahun_berdiri: int | None = Field(
        default=None,
        ge=1900,
        le=2100,
    )

    alamat: str = Field(min_length=5)

    kontak: str | None = Field(
        default=None,
        max_length=50,
    )

    email_lembaga: EmailStr | None = None

    jumlah_anak_asuh: int | None = Field(
        default=None,
        ge=0,
    )

    deskripsi: str | None = None


class PengajuanLKSAUpdate(BaseModel):
    nama_panti: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    bentuk_lembaga: BentukLembaga | None = None

    tahun_berdiri: int | None = Field(
        default=None,
        ge=1900,
        le=2100,
    )

    alamat: str | None = Field(
        default=None,
        min_length=5,
    )

    kontak: str | None = Field(
        default=None,
        max_length=50,
    )

    email_lembaga: EmailStr | None = None

    jumlah_anak_asuh: int | None = Field(
        default=None,
        ge=0,
    )

    deskripsi: str | None = None


# ==========================================
# RESPONS DOKUMEN
# ==========================================

class DokumenPengajuanResponse(BaseModel):
    id: int
    id_pengajuan: int

    jenis_dokumen: str
    label_dokumen: str | None = None

    nama_file_asli: str
    bucket_name: str
    path_file: str

    mime_type: str | None = None
    ukuran_byte: int | None = None

    status_verifikasi: str
    hasil_ai: dict | list | None = None
    catatan_verifikasi: str | None = None

    tanggal_upload: datetime
    tanggal_verifikasi: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# RESPONS PENGAJUAN
# ==========================================

class PengajuanLKSAResponse(BaseModel):
    id: int
    id_pengelola: int
    id_panti: int | None = None

    nama_panti: str
    bentuk_lembaga: str
    tahun_berdiri: int | None = None

    alamat: str
    kontak: str | None = None
    email_lembaga: str | None = None
    jumlah_anak_asuh: int | None = None
    deskripsi: str | None = None

    status_pengajuan: str
    catatan_admin: str | None = None

    id_admin_verifikator: int | None = None
    tanggal_diajukan: datetime | None = None
    tanggal_verifikasi: datetime | None = None

    tanggal_dibuat: datetime
    tanggal_diperbarui: datetime

    dokumen: list[DokumenPengajuanResponse] = []

    model_config = ConfigDict(from_attributes=True)
