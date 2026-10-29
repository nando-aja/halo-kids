
"""Private Supabase Storage for sensitive HaloKids complaint attachments.

Data laporan dan metadata lampiran disimpan di MySQL.
Berkas fisik disimpan dalam bucket privat Supabase Storage.
"""

import logging
from pathlib import PurePosixPath
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.report_attachment import LaporanPengaduanLampiran
from app.services.supabase_storage import supabase


logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per file
MAX_FILES_PER_REPORT = 5
SIGNED_URL_TTL_SECONDS = 300  # 5 menit

ALLOWED_EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
}


def _get_private_storage():
    """Ambil akses ke bucket privat yang dikonfigurasi."""

    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Supabase Storage belum dikonfigurasi. "
                "Periksa konfigurasi backend."
            ),
        )

    bucket = (settings.SUPABASE_PRIVATE_BUCKET or "").strip()

    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bucket privat Supabase belum dikonfigurasi.",
        )

    return supabase.storage.from_(bucket), bucket


def _close_uploads(files: list[UploadFile]) -> None:
    """Tutup file sementara setelah selesai diproses."""

    for file in files:
        try:
            file.file.close()
        except Exception:
            logger.debug(
                "Gagal menutup file upload sementara.",
                exc_info=True,
            )


def _read_and_validate_file(file: UploadFile) -> dict[str, Any]:
    """Validasi nama, ekstensi, ukuran, dan signature file."""

    raw_name = (file.filename or "").replace("\\", "/")
    filename = PurePosixPath(raw_name).name.strip()

    if not filename or filename in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama file lampiran tidak valid.",
        )

    extension = PurePosixPath(filename).suffix.lower()
    mime_type = ALLOWED_EXTENSIONS.get(extension)

    if not mime_type:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Format file harus JPG, JPEG, PNG, atau PDF.",
        )

    try:
        data = file.file.read(MAX_FILE_SIZE + 1)
    except Exception as exc:
        logger.exception("Gagal membaca file lampiran.")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File lampiran tidak dapat dibaca.",
        ) from exc

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File {filename} kosong.",
        )

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Ukuran setiap lampiran maksimal 10 MB.",
        )

    # Memeriksa signature dasar, bukan hanya nama ekstensi.
    valid_signature = (
        (
            extension in {".jpg", ".jpeg"}
            and data.startswith(b"\xff\xd8\xff")
        )
        or (
            extension == ".png"
            and data.startswith(b"\x89PNG\r\n\x1a\n")
        )
        or (
            extension == ".pdf"
            and data.startswith(b"%PDF-")
        )
    )

    if not valid_signature:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Isi file {filename} tidak sesuai dengan formatnya.",
        )

    return {
        "nama_file": filename[:255],
        "extension": extension,
        "mime_type": mime_type,
        "ukuran_bytes": len(data),
        "bytes": data,
    }


def _remove_storage_paths(
    bucket: str,
    paths: list[str],
) -> None:
    """Coba hapus objek Storage setelah upload atau transaksi gagal."""

    if not paths or supabase is None:
        return

    try:
        supabase.storage.from_(bucket).remove(paths)
    except Exception:
        logger.exception(
            "Gagal membersihkan objek lampiran dari Supabase Storage."
        )


def delete_uploaded_report_attachments(
    attachments: list[dict[str, Any]],
) -> None:
    """Hapus objek yang sudah diunggah jika penyimpanan metadata gagal."""

    if not attachments:
        return

    grouped_paths: dict[str, list[str]] = {}

    for item in attachments:
        bucket = item.get("storage_bucket")
        path = item.get("storage_path")

        if bucket and path:
            grouped_paths.setdefault(bucket, []).append(path)

    for bucket, paths in grouped_paths.items():
        # Jangan mengizinkan fungsi cleanup menghapus dari bucket lain.
        if bucket != settings.SUPABASE_PRIVATE_BUCKET:
            logger.warning(
                "Cleanup dilewati karena bucket tidak sesuai konfigurasi."
            )
            continue

        _remove_storage_paths(bucket, paths)


def upload_report_attachments(
    ticket_code: str,
    files: list[UploadFile],
) -> list[dict[str, Any]]:
    """
    Unggah bukti ke bucket privat Supabase.

    Fungsi mengembalikan metadata untuk disimpan endpoint ke MySQL.
    Fungsi ini tidak membuat laporan atau menyimpan metadata database.
    """

    attempted_paths: list[str] = []
    bucket: str | None = None

    try:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pilih minimal satu lampiran.",
            )

        if len(files) > MAX_FILES_PER_REPORT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maksimal {MAX_FILES_PER_REPORT} lampiran per laporan.",
            )

        storage, bucket = _get_private_storage()

        # Validasi seluruh file sebelum memulai upload.
        prepared_files = [
            _read_and_validate_file(file)
            for file in files
        ]

        uploaded_metadata: list[dict[str, Any]] = []

        for item in prepared_files:
            object_path = (
                f"laporan_publik/{ticket_code}/"
                f"{uuid4().hex}{item['extension']}"
            )

            # Catat path sebelum request agar cleanup dapat mencoba
            # menghapus objek jika request mengalami timeout.
            attempted_paths.append(object_path)

            storage.upload(
                path=object_path,
                file=item["bytes"],
                file_options={
                    "content-type": item["mime_type"],
                    "cache-control": "300",
                    "upsert": "false",
                },
            )

            uploaded_metadata.append({
                "nama_file": item["nama_file"],
                "storage_bucket": bucket,
                "storage_path": object_path,
                "mime_type": item["mime_type"],
                "ukuran_bytes": item["ukuran_bytes"],
            })

        return uploaded_metadata

    except HTTPException:
        if bucket and attempted_paths:
            _remove_storage_paths(bucket, attempted_paths)
        raise

    except Exception as exc:
        if bucket and attempted_paths:
            _remove_storage_paths(bucket, attempted_paths)

        logger.exception(
            "Upload lampiran pengaduan ke Supabase Storage gagal."
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Lampiran gagal disimpan ke penyimpanan aman. "
                "Laporan belum dikonfirmasi berhasil disimpan."
            ),
        ) from exc

    finally:
        _close_uploads(files)


def get_admin_signed_report_attachments(
    db: Session,
    report: Any,
) -> list[dict[str, Any]]:
    """
    Buat signed URL sementara untuk lampiran laporan.

    Panggil fungsi ini hanya dari endpoint yang mewajibkan akses admin.
    """

    storage, expected_bucket = _get_private_storage()

    rows = (
        db.query(LaporanPengaduanLampiran)
        .filter(
            LaporanPengaduanLampiran.id_laporan == report.id
        )
        .order_by(LaporanPengaduanLampiran.id.asc())
        .all()
    )

    expected_prefix = f"laporan_publik/{report.kode_tiket}/"
    attachments: list[dict[str, Any]] = []

    for row in rows:
        object_path = row.storage_path

        # Pastikan objek berasal dari bucket dan tiket yang benar.
        if row.storage_bucket != expected_bucket:
            logger.warning(
                "Bucket lampiran tidak sesuai. ID lampiran: %s",
                row.id,
            )
            continue

        if (
            not isinstance(object_path, str)
            or not object_path.startswith(expected_prefix)
            or ".." in PurePosixPath(object_path).parts
        ):
            logger.warning(
                "Path lampiran tidak valid. ID lampiran: %s",
                row.id,
            )
            continue

        try:
            response = storage.create_signed_url(
                object_path,
                SIGNED_URL_TTL_SECONDS,
            )

            if isinstance(response, dict):
                data = response.get("data", response)
            else:
                data = getattr(response, "data", None) or {}

            if isinstance(data, dict):
                signed_url = (
                    data.get("signedURL")
                    or data.get("signedUrl")
                    or data.get("signed_url")
                )
            else:
                signed_url = None

            if not isinstance(signed_url, str) or not signed_url:
                logger.warning(
                    "Signed URL tidak tersedia untuk lampiran ID %s",
                    row.id,
                )
                continue

            # SDK dapat mengembalikan URL absolut atau relatif.
            if signed_url.startswith("/storage/v1/"):
                signed_url = (
                    settings.SUPABASE_URL.rstrip("/") + signed_url
                )
            elif signed_url.startswith("/object/"):
                signed_url = (
                    settings.SUPABASE_URL.rstrip("/")
                    + "/storage/v1"
                    + signed_url
                )
            elif signed_url.startswith("/"):
                signed_url = (
                    settings.SUPABASE_URL.rstrip("/") + signed_url
                )

            attachments.append({
                "id": row.id,
                "nama_file": row.nama_file,
                "mime_type": row.mime_type,
                "ukuran_bytes": row.ukuran_bytes,
                "url": signed_url,
                "berlaku_detik": SIGNED_URL_TTL_SECONDS,
            })

        except Exception:
            # Jangan membuat URL publik sebagai fallback.
            logger.exception(
                "Gagal membuat signed URL untuk lampiran ID %s",
                row.id,
            )

    return attachments
