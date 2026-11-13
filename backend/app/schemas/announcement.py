from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AnnouncementCategory = Literal[
    "pembaruan",
    "panti_baru",
    "pengumuman",
]


class AnnouncementCreate(BaseModel):
    judul: str = Field(min_length=3, max_length=150)
    pesan: str = Field(min_length=3, max_length=500)
    kategori: AnnouncementCategory = "pengumuman"


class AnnouncementResponse(BaseModel):
    id: int
    judul: str
    pesan: str
    kategori: str
    id_panti: int | None = None
    aktif: bool
    tanggal_buat: datetime

    model_config = ConfigDict(from_attributes=True)
