from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

JenisKelamin = Literal["Laki-Laki", "Perempuan"]


class AnakAsuhCreate(BaseModel):
    nama: str = Field(min_length=2, max_length=150)
    usia: int | None = Field(default=None, ge=0, le=25)
    jenis_kelamin: JenisKelamin | None = None
    status_kesejahteraan: str | None = Field(default=None, max_length=50)
    pendidikan: str | None = Field(default=None, max_length=100)
    kondisi_kesehatan: str | None = Field(default=None, max_length=100)
    tanggal_masuk: date | None = None


class AnakAsuhUpdate(BaseModel):
    nama: str | None = Field(default=None, min_length=2, max_length=150)
    usia: int | None = Field(default=None, ge=0, le=25)
    jenis_kelamin: JenisKelamin | None = None
    status_kesejahteraan: str | None = Field(default=None, max_length=50)
    pendidikan: str | None = Field(default=None, max_length=100)
    kondisi_kesehatan: str | None = Field(default=None, max_length=100)
    tanggal_masuk: date | None = None


class AnakAsuhResponse(BaseModel):
    id: int
    id_panti: int
    nama: str
    usia: int | None = None
    jenis_kelamin: str | None = None
    status_kesejahteraan: str | None = None
    pendidikan: str | None = None
    kondisi_kesehatan: str | None = None
    tanggal_masuk: date | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
