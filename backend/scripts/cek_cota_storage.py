"""
Diagnostik COTA/Adopsi: apakah Supabase Storage tersambung dan apakah berkas
setiap pengajuan benar-benar ada.

Jalankan dari folder backend (venv aktif):
    python scripts/cek_cota_storage.py

Skrip ini hanya MEMBACA. Tidak mengubah database maupun storage.
"""
from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.db.database import SessionLocal  # noqa: E402
from app.db.models.adoption import PengajuanAdopsi  # noqa: E402
from app.services import storage  # noqa: E402
from app.services.supabase_storage import supabase  # noqa: E402


def cek_supabase() -> bool:
    print("=== 1. Koneksi Supabase ===")
    host = urlparse(settings.SUPABASE_URL).netloc or "(SUPABASE_URL kosong)"
    print(f"URL project    : {host}")
    print(f"Bucket private : {settings.SUPABASE_PRIVATE_BUCKET}")
    print(f"Bucket public  : {settings.SUPABASE_PUBLIC_BUCKET}")
    print(f"Secret key     : {'terisi' if settings.SUPABASE_SECRET_KEY else 'KOSONG'}")

    if supabase is None:
        print("HASIL: BELUM TERSAMBUNG. SUPABASE_URL / SUPABASE_SECRET_KEY kosong di backend/.env")
        return False

    try:
        names = [getattr(b, "name", None) or b.get("name") for b in supabase.storage.list_buckets()]
    except Exception as exc:  # noqa: BLE001
        print(f"HASIL: GAGAL tersambung -> {exc}")
        return False

    print(f"Bucket di project: {', '.join(names) or '(kosong)'}")
    for wajib in (settings.SUPABASE_PRIVATE_BUCKET, settings.SUPABASE_PUBLIC_BUCKET):
        print(f"  - {wajib}: {'ADA' if wajib in names else 'TIDAK ADA (buat di dashboard Supabase)'}")
    print("HASIL: tersambung.\n")
    return True


def lokasi_berkas(path: str) -> str:
    """Kembalikan 'lokal', 'cache', 'supabase', atau 'TIDAK ADA'."""
    try:
        bucket, object_path = storage._get_object_path(path)  # noqa: SLF001
    except Exception as exc:  # noqa: BLE001
        return f"PATH TIDAK VALID ({getattr(exc, 'detail', exc)})"

    if storage._safe_local_path(path).is_file():  # noqa: SLF001
        return "lokal"
    if storage._get_cache_path(path).is_file():  # noqa: SLF001
        return "cache"
    if supabase is None:
        return "TIDAK ADA (Supabase belum tersambung)"

    folder, _, nama = object_path.rpartition("/")
    try:
        items = supabase.storage.from_(bucket).list(folder, {"search": nama, "limit": 10})
        if any(item.get("name") == nama for item in items or []):
            return "supabase"
    except Exception as exc:  # noqa: BLE001
        return f"TIDAK ADA (gagal cek Supabase: {exc})"
    return "TIDAK ADA"


def cek_pengajuan() -> None:
    print("=== 2. Berkas tiap pengajuan COTA ===")
    db = SessionLocal()
    try:
        rows = db.query(PengajuanAdopsi).order_by(PengajuanAdopsi.id).all()
        if not rows:
            print("Belum ada pengajuan COTA di database.")
            return
        for item in rows:
            print(f"\nPengajuan #{item.id} - {item.nama_pemohon} (status: {item.status})")
            berkas = {"ktp": item.dokumen_ktp, "kk": item.dokumen_kk}
            pendukung = item.dokumen_pendukung or {}
            if isinstance(pendukung, dict):
                berkas.update(pendukung)
            else:
                berkas.update({f"dokumen_pendukung_{i}": p for i, p in enumerate(pendukung, 1)})
            for kunci, path in berkas.items():
                if not path:
                    print(f"  {kunci:<22} (kosong)")
                    continue
                print(f"  {kunci:<22} {lokasi_berkas(str(path)):<12} {path}")
    finally:
        db.close()


if __name__ == "__main__":
    cek_supabase()
    cek_pengajuan()
    print(
        "\nCatatan: path berakhiran _sample / _default berarti pengajuan dibuat dari form lama "
        "yang tidak mengunggah berkas sungguhan. Buat pengajuan baru dengan form yang sudah diperbaiki."
    )
