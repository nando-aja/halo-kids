from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ReportStatus = Literal[
    "baru",
    "diproses",
    "selesai",
]


ReportType = Literal[
    "kekerasan",
    "eksploitasi",
    "panti_ilegal",
    "lainnya",
]


class ReportCreate(BaseModel):
    isi_laporan: str = Field(min_length=10)
    jenis_laporan: ReportType
    submission_key: str | None = Field(default=None, min_length=16, max_length=80)

    @field_validator("jenis_laporan", mode="before")
    @classmethod
    def normalize_report_type(cls, value: object) -> object:
        """Terima kode API maupun label kategori yang tampil di frontend.

        Nilai yang tersimpan di database tetap menggunakan kode kanonis agar
        daftar laporan dan statistik konsisten.
        """
        if not isinstance(value, str):
            return value

        normalized = value.strip().lower().replace("-", "_")
        if normalized in {"kekerasan", "eksploitasi", "panti_ilegal", "lainnya"}:
            return normalized

        compact = " ".join(normalized.replace("_", " ").split())
        if "panti" in compact and ("ilegal" in compact or "tidak berizin" in compact):
            return "panti_ilegal"
        if "eksploitasi" in compact or "perdagangan anak" in compact or "child trafficking" in compact:
            return "eksploitasi"
        if any(term in compact for term in ("kekerasan", "fisik", "psikis", "seksual", "verbal", "abuse")):
            return "kekerasan"
        if "lain" in compact or "other" in compact:
            return "lainnya"

        # Label kategori baru yang belum dipetakan tidak boleh memutus alur
        # pengaduan; simpan sebagai kategori umum, sedangkan label lengkap tetap
        # dipertahankan di isi_laporan.
        return "lainnya"


class ReportResponse(BaseModel):
    id: int
    id_user: int | None
    kode_tiket: str
    isi_laporan: str
    jenis_laporan: str
    status: ReportStatus
    tanggal_lapor: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicReportStatus(BaseModel):
    kode_tiket: str
    status: ReportStatus
    tanggal_lapor: datetime
    lampiran_tersimpan: int | None = None

    model_config = ConfigDict(from_attributes=True)
